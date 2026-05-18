import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def _get_recipient(skater):
    """Return the email recipient (User) for a skater: managed_by, then own user."""
    if skater.managed_by and skater.managed_by.email:
        return skater.managed_by
    user = getattr(skater, "user", None)
    if user and user.email:
        return user
    return None


def _base_context(club, recipient, frontend_url=None):
    """Build common context dict shared by all email templates."""
    return {
        "club": club,
        "recipient_name": recipient.first_name if recipient else "",
        "frontend_url": frontend_url or getattr(settings, "FRONTEND_URL", ""),
        "club_primary_color": getattr(club, "primary_color", "#5B2C91") if club else "#5B2C91",
    }


def _render_email(base_ctx, content_template, content_ctx):
    """Render content partial then inject into base wrapper, returning HTML string."""
    content_html = render_to_string(content_template, {**base_ctx, **content_ctx})
    full_ctx = {**base_ctx, "content": content_html}
    return render_to_string("emails/base_email.html", full_ctx)


def send_push_notification(user_id: int, title: str, body: str, url: str = "/") -> int:
    """
    Send a Web Push notification to all subscriptions for the given user.

    Returns the count of successful sends. Stale subscriptions (HTTP 410 Gone)
    are automatically removed.
    """
    if not getattr(settings, "VAPID_PRIVATE_KEY", "") or not getattr(settings, "VAPID_PUBLIC_KEY", ""):
        logger.debug("VAPID keys not configured — skipping push notification for user %s", user_id)
        return 0

    from pywebpush import webpush, WebPushException
    from .models import PushSubscription
    import json

    subscriptions = list(PushSubscription.objects.filter(user_id=user_id))
    sent = 0

    for sub in subscriptions:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        payload = json.dumps({"title": title, "body": body, "url": url})
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={
                    "sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}",
                },
            )
            sent += 1
        except WebPushException as exc:
            response = getattr(exc, "response", None)
            status_code = response.status_code if response is not None else None
            if status_code == 410:
                logger.info(
                    "Push subscription gone (410) for user %s, endpoint %s — deleting",
                    user_id,
                    sub.endpoint[:60],
                )
                sub.delete()
            else:
                logger.warning(
                    "WebPushException for user %s (status=%s): %s",
                    user_id,
                    status_code,
                    exc,
                )
        except Exception as exc:
            logger.warning("Unexpected error sending push to user %s: %s", user_id, exc)

    logger.info(
        "Push notification sent to %d/%d subscriptions for user %s",
        sent,
        len(subscriptions),
        user_id,
    )
    return sent


def send_renewal_reminder_email(skater, days_remaining: int):
    """Send HTML membership renewal reminder to the skater's managing user."""
    recipient = _get_recipient(skater)
    if not recipient:
        return

    club = getattr(skater, "club", None)
    from_email = (club.email if club and club.email else None) or settings.DEFAULT_FROM_EMAIL
    frontend_url = getattr(settings, "FRONTEND_URL", "")

    base_ctx = _base_context(club, recipient, frontend_url)
    content_ctx = {
        "skater_name": skater.full_name,
        "days_until_expiry": days_remaining,
        "membership_type_name": skater.membership_type.name if skater.membership_type else "Membership",
        "membership_expiry": skater.membership_expiry,
    }
    html_message = _render_email(base_ctx, "emails/renewal_reminder_content.html", content_ctx)

    subject = f"Membership renewal reminder — {days_remaining} day{'s' if days_remaining != 1 else ''} left"
    plain_body = (
        f"Hi {recipient.first_name or 'there'},\n\n"
        f"{skater.full_name}'s {club.name if club else ''} membership expires in {days_remaining} days "
        f"({skater.membership_expiry}).\n\n"
        f"Please log in to renew before it expires.\n\n"
        f"Renew at: {frontend_url}/member/renew\n\n"
        f"— {club.name if club else 'The Club'}"
    )
    send_mail(
        subject=subject,
        message=plain_body,
        from_email=from_email,
        recipient_list=[recipient.email],
        html_message=html_message,
        fail_silently=False,
    )
    logger.info("Renewal reminder sent to %s for skater %s", recipient.email, skater.id)


def send_booking_confirmation_email(booking):
    """Send HTML lesson booking confirmation to the skater's managing user."""
    skater = booking.skater
    recipient = _get_recipient(skater)
    if not recipient:
        return

    club = getattr(booking, "club", None)
    from_email = (club.email if club and club.email else None) or settings.DEFAULT_FROM_EMAIL
    frontend_url = getattr(settings, "FRONTEND_URL", "")

    # Determine payment info: check if a package was used for this booking
    # (sessions_remaining comes from the skater's active purchased package for this lesson type)
    package_sessions_remaining = None
    try:
        active_pkg = skater.lesson_packages.filter(
            package__lesson_type=booking.lesson_type,
            payment_status="paid",
        ).order_by("-purchased_at").first()
        if active_pkg and active_pkg.is_active:
            package_sessions_remaining = active_pkg.lessons_remaining
    except Exception:
        pass

    # Location: use club address if available, or empty string
    location = ""
    if club:
        parts = [p for p in [club.address, club.city, club.state] if p]
        location = ", ".join(parts)

    base_ctx = _base_context(club, recipient, frontend_url)
    content_ctx = {
        "skater_name": skater.full_name,
        "lesson_type_name": booking.lesson_type.name,
        "coach_name": booking.coach.user.get_full_name(),
        "scheduled_date": booking.scheduled_date.strftime("%A, %B %d, %Y"),
        "scheduled_time": booking.scheduled_time.strftime("%I:%M %p").lstrip("0"),
        "duration_minutes": booking.duration_minutes,
        "location": location,
        "package_sessions_remaining": package_sessions_remaining,
        "amount_paid": booking.amount_paid,
    }
    html_message = _render_email(base_ctx, "emails/booking_confirmation_content.html", content_ctx)

    subject = f"Lesson confirmed — {booking.lesson_type.name} on {booking.scheduled_date.strftime('%B %d, %Y')}"
    plain_body = (
        f"Hi {recipient.first_name or 'there'},\n\n"
        f"Your lesson has been confirmed:\n"
        f"  Skater: {skater.full_name}\n"
        f"  Type: {booking.lesson_type.name}\n"
        f"  Date: {booking.scheduled_date}\n"
        f"  Time: {booking.scheduled_time}\n"
        f"  Instructor: {booking.coach.user.get_full_name()}\n\n"
        f"View your lessons at: {frontend_url}/member/lessons\n\n"
        f"— {club.name if club else 'The Club'}"
    )
    send_mail(
        subject=subject,
        message=plain_body,
        from_email=from_email,
        recipient_list=[recipient.email],
        html_message=html_message,
        fail_silently=False,
    )
    logger.info("Booking confirmation sent to %s for booking %s", recipient.email, booking.id)


def send_payment_confirmation_email(payment):
    """Send payment confirmation to the payer (plain text — no dedicated HTML template)."""
    recipient = payment.payer
    if not recipient or not recipient.email:
        return

    club = getattr(payment, "club", None)
    from_email = (club.email if club and club.email else None) or settings.DEFAULT_FROM_EMAIL

    subject = f"Payment confirmed — {payment.get_payment_type_display()} ${payment.amount}"
    body = (
        f"Hi {recipient.first_name or 'there'},\n\n"
        f"We've received your payment:\n"
        f"  Type: {payment.get_payment_type_display()}\n"
        f"  Amount: ${payment.amount} {payment.currency}\n"
        f"  Date: {payment.created_at.strftime('%B %d, %Y')}\n"
    )
    if payment.description:
        body += f"  Description: {payment.description}\n"
    body += f"\nThank you!\n\n— {club.name if club else 'The Club'}"

    send_mail(
        subject=subject,
        message=body,
        from_email=from_email,
        recipient_list=[recipient.email],
        fail_silently=False,
    )
    logger.info("Payment confirmation sent to %s for payment %s", recipient.email, payment.id)


def send_lesson_reminder_email(booking):
    """Send HTML day-before reminder for a confirmed lesson booking."""
    skater = booking.skater
    recipient = _get_recipient(skater)
    if not recipient:
        return

    club = getattr(booking, "club", None)
    from_email = (club.email if club and club.email else None) or settings.DEFAULT_FROM_EMAIL
    frontend_url = getattr(settings, "FRONTEND_URL", "")

    location = ""
    if club:
        parts = [p for p in [club.address, club.city, club.state] if p]
        location = ", ".join(parts)

    base_ctx = _base_context(club, recipient, frontend_url)
    content_ctx = {
        "skater_name": skater.full_name,
        "lesson_type_name": booking.lesson_type.name,
        "coach_name": booking.coach.user.get_full_name(),
        "scheduled_date": booking.scheduled_date.strftime("%A, %B %d, %Y"),
        "scheduled_time": booking.scheduled_time.strftime("%I:%M %p").lstrip("0"),
        "location": location,
    }
    html_message = _render_email(base_ctx, "emails/lesson_reminder_content.html", content_ctx)

    subject = f"Reminder: lesson tomorrow — {booking.lesson_type.name} at {booking.scheduled_time.strftime('%I:%M %p').lstrip('0')}"
    plain_body = (
        f"Hi {recipient.first_name or 'there'},\n\n"
        f"This is a reminder that {skater.full_name} has a lesson tomorrow:\n"
        f"  Type: {booking.lesson_type.name}\n"
        f"  Date: {booking.scheduled_date}\n"
        f"  Time: {booking.scheduled_time}\n"
        f"  Instructor: {booking.coach.user.get_full_name()}\n\n"
        f"View your lessons at: {frontend_url}/member/lessons\n\n"
        f"— {club.name if club else 'The Club'}"
    )
    send_mail(
        subject=subject,
        message=plain_body,
        from_email=from_email,
        recipient_list=[recipient.email],
        html_message=html_message,
        fail_silently=False,
    )
    logger.info("Lesson reminder sent to %s for booking %s", recipient.email, booking.id)


def send_competition_entry_confirmation_email(entry):
    """Send HTML competition entry confirmation to the skater's managing user."""
    skater = entry.skater
    recipient = _get_recipient(skater)
    if not recipient:
        return

    club = getattr(entry, "club", None)
    from_email = (club.email if club and club.email else None) or settings.DEFAULT_FROM_EMAIL
    frontend_url = getattr(settings, "FRONTEND_URL", "")

    competition = entry.competition
    category = entry.category

    # Build location string from competition fields
    comp_location_parts = [p for p in [competition.venue, competition.city, competition.state] if p]
    competition_location = ", ".join(comp_location_parts)

    # Build per-category list (only the one entry in this notification)
    categories = [
        {
            "name": category.name,
            "fee": entry.entry_fee,
        }
    ]

    base_ctx = _base_context(club, recipient, frontend_url)
    content_ctx = {
        "skater_name": skater.full_name,
        "competition_name": competition.name,
        "competition_start_date": competition.start_date.strftime("%B %d, %Y"),
        "competition_end_date": competition.end_date.strftime("%B %d, %Y"),
        "competition_location": competition_location,
        "categories": categories,
        "is_late": entry.is_late,
        "late_fee": competition.late_fee,
        "total_fee": entry.total_fee,
        "entry_status": entry.status,
    }
    html_message = _render_email(
        base_ctx, "emails/competition_entry_confirmation_content.html", content_ctx
    )

    subject = f"Entry submitted — {competition.name}"
    plain_body = (
        f"Hi {recipient.first_name or 'there'},\n\n"
        f"{skater.full_name}'s entry for {competition.name} has been submitted.\n\n"
        f"  Category: {category.name}\n"
        f"  Competition dates: {competition.start_date} – {competition.end_date}\n"
        f"  Entry fee: ${entry.entry_fee}\n"
        f"  Status: {entry.get_status_display()}\n\n"
        f"View your entries at: {frontend_url}/member/competitions\n\n"
        f"— {club.name if club else 'The Club'}"
    )
    send_mail(
        subject=subject,
        message=plain_body,
        from_email=from_email,
        recipient_list=[recipient.email],
        html_message=html_message,
        fail_silently=False,
    )
    logger.info("Competition entry confirmation sent to %s for entry %s", recipient.email, entry.id)
