import logging
from datetime import datetime, timezone as dt_timezone

import stripe
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from apps.common.models import AuditLog
from apps.members.models import Skater

logger = logging.getLogger(__name__)

SUBSCRIPTION_STATUS_MAP = {
    "active": "active",
    "past_due": "active",
    "canceled": "expired",
    "unpaid": "suspended",
}


def _handle_checkout_session_completed(event):
    """Activate skater membership after successful checkout."""
    session = event["data"]["object"]
    metadata = session.get("metadata", {})
    skater_ids_raw = metadata.get("skater_ids")
    skater_id = metadata.get("skater_id")
    membership_type_id = metadata.get("membership_type_id")

    if not skater_ids_raw and not skater_id:
        logger.warning("checkout.session.completed missing skater_id(s), event=%s", event["id"])
        return

    subscription_id = session.get("subscription")
    expiry_date = None
    if subscription_id:
        subscription = stripe.Subscription.retrieve(subscription_id)
        period_end = subscription.get("current_period_end")
        if period_end:
            expiry_date = datetime.fromtimestamp(period_end, tz=dt_timezone.utc).date()

    update_fields = {"membership_status": "active"}
    if expiry_date:
        update_fields["membership_expiry"] = expiry_date

    if skater_ids_raw:
        skater_ids = [sid.strip() for sid in skater_ids_raw.split(",") if sid.strip()]
        Skater.all_objects.filter(id__in=skater_ids).update(**update_fields)
        activated_skaters = list(Skater.all_objects.filter(id__in=skater_ids))
        club = activated_skaters[0].club if activated_skaters else None
        AuditLog.objects.create(
            club=club,
            action="membership.activated",
            metadata={
                "skater_ids": skater_ids,
                "family_group_id": metadata.get("family_group_id"),
                "membership_expiry": str(expiry_date) if expiry_date else None,
                "stripe_event_id": event["id"],
                "stripe_session_id": session.get("id"),
            },
        )
        logger.info(
            "checkout.session.completed: %d skaters activated (family), event=%s",
            len(skater_ids),
            event["id"],
        )
    else:
        if membership_type_id:
            update_fields["membership_type_id"] = membership_type_id

        skater, _ = Skater.all_objects.update_or_create(
            id=skater_id,
            defaults=update_fields,
        )

        AuditLog.objects.create(
            club=skater.club,
            action="membership.activated",
            metadata={
                "skater_id": str(skater_id),
                "membership_type_id": str(membership_type_id) if membership_type_id else None,
                "membership_expiry": str(expiry_date) if expiry_date else None,
                "stripe_event_id": event["id"],
                "stripe_session_id": session.get("id"),
            },
        )
        logger.info(
            "checkout.session.completed: skater=%s activated, event=%s",
            skater_id,
            event["id"],
        )


def _handle_subscription_updated(event):
    """Sync membership status from Stripe subscription update."""
    subscription = event["data"]["object"]
    stripe_status = subscription.get("status", "")
    new_status = SUBSCRIPTION_STATUS_MAP.get(stripe_status)

    if new_status is None:
        logger.warning(
            "customer.subscription.updated: unknown stripe status=%s, event=%s",
            stripe_status,
            event["id"],
        )
        return

    metadata = subscription.get("metadata", {})
    skater_id = metadata.get("skater_id")
    if not skater_id:
        logger.warning(
            "customer.subscription.updated: no skater_id in metadata, event=%s",
            event["id"],
        )
        return

    period_end = subscription.get("current_period_end")
    expiry_date = None
    if period_end:
        expiry_date = datetime.fromtimestamp(period_end, tz=dt_timezone.utc).date()

    update_defaults = {"membership_status": new_status}
    if expiry_date:
        update_defaults["membership_expiry"] = expiry_date

    Skater.all_objects.filter(id=skater_id).update(**update_defaults)

    logger.info(
        "customer.subscription.updated: skater=%s status=%s, event=%s",
        skater_id,
        new_status,
        event["id"],
    )


def _handle_subscription_deleted(event):
    """Expire membership when Stripe subscription is deleted."""
    subscription = event["data"]["object"]
    metadata = subscription.get("metadata", {})
    skater_id = metadata.get("skater_id")

    if not skater_id:
        logger.warning(
            "customer.subscription.deleted: no skater_id in metadata, event=%s",
            event["id"],
        )
        return

    Skater.all_objects.filter(id=skater_id).update(membership_status="expired")

    logger.info(
        "customer.subscription.deleted: skater=%s expired, event=%s",
        skater_id,
        event["id"],
    )


def _handle_invoice_payment_failed(event):
    """Log payment failure; do not change membership status (grace period handled separately)."""
    invoice = event["data"]["object"]
    customer_id = invoice.get("customer")
    subscription_id = invoice.get("subscription")

    logger.warning(
        "invoice.payment_failed: customer=%s subscription=%s event=%s",
        customer_id,
        subscription_id,
        event["id"],
    )


EVENT_HANDLERS = {
    "checkout.session.completed": _handle_checkout_session_completed,
    "customer.subscription.updated": _handle_subscription_updated,
    "customer.subscription.deleted": _handle_subscription_deleted,
    "invoice.payment_failed": _handle_invoice_payment_failed,
}


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """Verify and dispatch Stripe webhook events."""
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("stripe_webhook: invalid payload")
        return JsonResponse({"error": "Invalid payload"}, status=400)
    except stripe.error.SignatureVerificationError:
        logger.error("stripe_webhook: invalid signature")
        return JsonResponse({"error": "Invalid signature"}, status=400)

    event_type = event["type"]
    handler = EVENT_HANDLERS.get(event_type)

    if handler is None:
        logger.info("stripe_webhook: ignored event type=%s id=%s", event_type, event["id"])
        return JsonResponse({"status": "ignored"})

    logger.info("stripe_webhook: handling event type=%s id=%s", event_type, event["id"])

    try:
        handler(event)
    except Exception:
        logger.exception(
            "stripe_webhook: error handling event type=%s id=%s",
            event_type,
            event["id"],
        )

    return JsonResponse({"status": "ok"})
