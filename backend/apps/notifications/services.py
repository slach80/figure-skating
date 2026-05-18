import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


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
    """Send membership renewal reminder to the skater's managing user."""
    recipient = skater.managed_by
    if not recipient or not recipient.email:
        return

    subject = f"Membership renewal reminder — {days_remaining} days left"
    body = (
        f"Hi {recipient.first_name or 'there'},\n\n"
        f"{skater.full_name}'s {skater.club.name} membership expires in {days_remaining} days "
        f"({skater.membership_expiry}).\n\n"
        f"Please log in to renew before it expires.\n\n"
        f"— {skater.club.name}"
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient.email],
        fail_silently=False,
    )
    logger.info("Renewal reminder sent to %s for skater %s", recipient.email, skater.id)


def send_booking_confirmation_email(booking):
    """Send lesson booking confirmation to the skater's managing user."""
    recipient = booking.skater.managed_by
    if not recipient or not recipient.email:
        return

    subject = f"Lesson confirmed — {booking.lesson_type.name} on {booking.scheduled_date}"
    body = (
        f"Hi {recipient.first_name or 'there'},\n\n"
        f"Your lesson has been confirmed:\n"
        f"  Skater: {booking.skater.full_name}\n"
        f"  Type: {booking.lesson_type.name}\n"
        f"  Date: {booking.scheduled_date}\n"
        f"  Time: {booking.scheduled_time}\n"
        f"  Instructor: {booking.coach.user.get_full_name()}\n\n"
        f"— {booking.club.name}"
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient.email],
        fail_silently=False,
    )
    logger.info("Booking confirmation sent to %s for booking %s", recipient.email, booking.id)


def send_payment_confirmation_email(payment):
    """Send payment confirmation to the payer."""
    recipient = payment.payer
    if not recipient or not recipient.email:
        return

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
    body += f"\nThank you!\n\n— {payment.club.name}"

    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient.email],
        fail_silently=False,
    )
    logger.info("Payment confirmation sent to %s for payment %s", recipient.email, payment.id)


def send_lesson_reminder_email(booking):
    """Send day-before reminder for a confirmed lesson booking."""
    skater = booking.skater
    recipient = getattr(skater, "managed_by", None)
    if not recipient or not recipient.email:
        user = getattr(skater, "user", None)
        if not user or not user.email:
            return
        recipient = user

    subject = f"Reminder: lesson tomorrow — {booking.lesson_type.name} at {booking.scheduled_time}"
    body = (
        f"Hi {recipient.first_name or 'there'},\n\n"
        f"This is a reminder that {skater.full_name} has a lesson tomorrow:\n"
        f"  Type: {booking.lesson_type.name}\n"
        f"  Date: {booking.scheduled_date}\n"
        f"  Time: {booking.scheduled_time}\n"
        f"  Instructor: {booking.coach.user.get_full_name()}\n\n"
        f"— {booking.club.name}"
    )
    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient.email],
        fail_silently=False,
    )
    logger.info("Lesson reminder sent to %s for booking %s", recipient.email, booking.id)
