import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_renewal_reminders(self):
    """Send membership renewal reminders at 30, 14, and 7 days before expiry."""
    from apps.members.models import Skater
    from apps.notifications.services import send_renewal_reminder_email

    today = timezone.now().date()
    reminder_days = [30, 14, 7]

    for days in reminder_days:
        target_date = today + timedelta(days=days)
        expiring = Skater.objects.filter(
            membership_expiry=target_date,
            membership_status="active",
            deleted_at__isnull=True,
        ).select_related("managed_by", "club", "membership_type")

        for skater in expiring:
            try:
                send_renewal_reminder_email(skater, days_remaining=days)
            except Exception as exc:
                logger.warning("Failed to send renewal reminder for skater %s: %s", skater.id, exc)

    logger.info("Renewal reminder task complete for date %s", today)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def expire_lapsed_memberships(self):
    """Set membership_status=expired for any skater whose expiry has passed."""
    from apps.members.models import Skater

    today = timezone.now().date()
    count = Skater.objects.filter(
        membership_expiry__lt=today,
        membership_status="active",
        deleted_at__isnull=True,
    ).update(membership_status="expired")

    logger.info("Expired %d lapsed memberships", count)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_confirmation(self, booking_id: str):
    """Send lesson booking confirmation email."""
    from apps.scheduling.models import LessonBooking
    from apps.notifications.services import send_booking_confirmation_email

    try:
        booking = LessonBooking.objects.select_related(
            "skater", "instructor", "lesson_type", "club"
        ).get(id=booking_id)
        send_booking_confirmation_email(booking)
    except LessonBooking.DoesNotExist:
        logger.warning("Booking %s not found for confirmation email", booking_id)
    except Exception as exc:
        logger.warning("Failed to send booking confirmation for %s: %s", booking_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def sync_skater_stats(self):
    """Refresh Skater-Stats competition history for all active members with a slug."""
    from apps.members.models import Skater
    from apps.competitions.services import SkaterStatsClient

    skaters = Skater.objects.filter(
        membership_status="active",
        deleted_at__isnull=True,
    ).exclude(skater_stats_slug="")

    with SkaterStatsClient() as client:
        for skater in skaters:
            try:
                data = client.get_skater(skater.skater_stats_slug)
                if data:
                    skater.skater_stats_last_synced = timezone.now()
                    skater.save(update_fields=["skater_stats_last_synced"])
            except Exception as exc:
                logger.warning("Skater-Stats sync failed for %s: %s", skater.id, exc)

    logger.info("Skater-Stats sync complete — %d skaters processed", skaters.count())
