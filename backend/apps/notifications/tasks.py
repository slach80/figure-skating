import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
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
    from apps.scheduling.models import Booking
    from apps.notifications.services import send_booking_confirmation_email

    try:
        booking = Booking.objects.select_related(
            "skater", "coach__user", "lesson_type", "club"
        ).get(id=booking_id)
        send_booking_confirmation_email(booking)
    except Booking.DoesNotExist:
        logger.warning("Booking %s not found for confirmation email", booking_id)
    except Exception as exc:
        logger.warning("Failed to send booking confirmation for %s: %s", booking_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_payment_confirmation(self, payment_id: str):
    """Send payment confirmation email after a successful payment."""
    from apps.payments.models import Payment
    from apps.notifications.services import send_payment_confirmation_email

    try:
        payment = Payment.objects.select_related("payer", "club").get(id=payment_id)
        send_payment_confirmation_email(payment)
    except Payment.DoesNotExist:
        logger.warning("Payment %s not found for confirmation email", payment_id)
    except Exception as exc:
        logger.warning("Failed to send payment confirmation for %s: %s", payment_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def send_lesson_reminders(self):
    """Send lesson reminders for all confirmed bookings scheduled tomorrow."""
    from apps.scheduling.models import Booking
    from apps.notifications.services import send_lesson_reminder_email

    tomorrow = timezone.now().date() + timedelta(days=1)
    bookings = Booking.objects.filter(
        scheduled_date=tomorrow,
        status=Booking.STATUS_CONFIRMED,
    ).select_related("skater__managed_by", "skater__user", "coach__user", "lesson_type", "club")

    for booking in bookings:
        try:
            send_lesson_reminder_email(booking)
        except Exception as exc:
            logger.warning("Failed to send lesson reminder for booking %s: %s", booking.id, exc)

    logger.info("Lesson reminder task complete — %d bookings processed for %s", bookings.count(), tomorrow)


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


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_push_to_user(self, user_id: int, title: str, body: str, url: str = "/"):
    """Send a Web Push notification to all subscriptions for a user."""
    from apps.notifications.services import send_push_notification

    try:
        return send_push_notification(user_id, title, body, url)
    except Exception as exc:
        logger.warning("send_push_to_user failed for user %s: %s", user_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_broadcast_email(self, club_id: str, subject: str, body: str, recipient_filter: dict):
    """Send bulk email to a filtered subset of club members."""
    import uuid
    from apps.members.models import Skater

    try:
        club_uuid = uuid.UUID(club_id)
    except ValueError:
        logger.warning("send_broadcast_email: invalid club_id %s", club_id)
        return None

    qs = Skater.objects.filter(club_id=club_uuid, deleted_at__isnull=True)

    # Apply filters
    if recipient_filter.get("membership_status"):
        qs = qs.filter(membership_status=recipient_filter["membership_status"])
    if recipient_filter.get("expiring_days"):
        target = timezone.now().date() + timedelta(days=int(recipient_filter["expiring_days"]))
        qs = qs.filter(membership_expiry__lte=target, membership_status="active")

    # Collect unique recipient emails from managing user or skater user
    emails: set[str] = set()
    for skater in qs.select_related("managed_by", "user"):
        recipient = skater.managed_by or getattr(skater, "user", None)
        if recipient and recipient.email:
            emails.add(recipient.email)

    sent = 0
    for email in emails:
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
            sent += 1
        except Exception as exc:
            logger.warning("Broadcast failed for %s: %s", email, exc)

    logger.info("Broadcast sent to %d recipients", sent)
    return sent
