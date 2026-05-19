"""
Fake checkout flow used when STRIPE_TEST_MODE=True.
Bypasses Stripe entirely — creates a pending payment, returns a local checkout URL,
and provides a /complete/ endpoint that activates the skater immediately.
"""
import uuid
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.models import AuditLog
from apps.members.models import Skater
from apps.payments.models import Payment


class FakeCheckoutCompleteView(APIView):
    """
    POST /api/v1/payments/fake-checkout/complete/
    Body: { "payment_id": "<uuid>", "action": "pay" | "cancel" }

    Called by the fake checkout page when the user clicks Confirm or Cancel.
    Mimics what the Stripe webhook does on checkout.session.completed.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_id = request.data.get("payment_id")
        action = request.data.get("action", "pay")

        if not payment_id:
            return Response({"error": "payment_id required"}, status=400)

        try:
            payment = Payment.objects.get(id=payment_id, status=Payment.STATUS_PENDING)
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found or already processed"}, status=404)

        if action == "cancel":
            payment.status = Payment.STATUS_FAILED
            payment.save(update_fields=["status"])
            return Response({"status": "cancelled"})

        # Activate all skaters linked to this payment via the fake session metadata
        session_id = payment.stripe_checkout_session_id
        if session_id and session_id.startswith("fake_"):
            # session_id encodes metadata: fake_<skater_ids>_<family_group_id>
            parts = session_id.split("_", 2)
            skater_ids_raw = parts[1] if len(parts) > 1 else ""
            skater_ids = [s for s in skater_ids_raw.split(",") if s]
        else:
            skater_ids = []

        if skater_ids:
            Skater.all_objects.filter(id__in=skater_ids).update(membership_status="active")
            AuditLog.objects.create(
                club=payment.club,
                actor=request.user,
                action="membership.activated",
                metadata={
                    "skater_ids": skater_ids,
                    "payment_id": str(payment.id),
                    "test_mode": True,
                },
            )

        payment.status = Payment.STATUS_SUCCEEDED
        payment.save(update_fields=["status"])

        return Response({"status": "succeeded", "skater_ids": skater_ids})


class FakeCheckoutDetailsView(APIView):
    """
    GET /api/v1/payments/fake-checkout/<payment_id>/
    Returns payment details for the fake checkout page to display.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        skater_names = []
        session_id = payment.stripe_checkout_session_id
        if session_id and session_id.startswith("fake_"):
            parts = session_id.split("_", 2)
            skater_ids_raw = parts[1] if len(parts) > 1 else ""
            skater_ids = [s for s in skater_ids_raw.split(",") if s]
            skater_names = list(
                Skater.all_objects.filter(id__in=skater_ids).values_list("first_name", "last_name")
            )
            skater_names = [f"{fn} {ln}" for fn, ln in skater_names]

        return Response({
            "payment_id": str(payment.id),
            "amount": str(payment.amount),
            "currency": payment.currency.upper(),
            "description": payment.description,
            "status": payment.status,
            "skaters": skater_names,
        })
