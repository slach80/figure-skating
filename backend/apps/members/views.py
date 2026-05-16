import csv
import io
from datetime import date, timedelta
from decimal import Decimal

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.mixins import ClubScopedViewMixin
from apps.common.models import AuditLog
from apps.common.permissions import IsClubAdmin
from apps.members.models import ConsentRecord, MembershipType, Skater
from apps.members.serializers import SkaterDetailSerializer, SkaterListSerializer
from apps.payments.models import Payment

stripe.api_key = settings.STRIPE_SECRET_KEY

USFS_CSV_COLUMNS = [
    "FirstName",
    "LastName",
    "DateOfBirth",
    "Email",
    "AddressLine1",
    "AddressLine2",
    "City",
    "State",
    "ZipCode",
    "Phone",
    "MembershipType",
    "USFSNumber",
    "MembershipStatus",
]


class SkaterViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    serializer_class = SkaterDetailSerializer
    # DRF router requires queryset on the class; actual filtering done in get_queryset()
    queryset = Skater.all_objects.all()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return SkaterListSerializer
        return SkaterDetailSerializer

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related("membership_type", "managed_by", "family_group")
            .filter(deleted_at__isnull=True)
        )

    @action(detail=False, methods=["get"], url_path="stats", permission_classes=[IsAuthenticated])
    def stats(self, request):
        qs = self.get_queryset()
        today = timezone.now().date()
        expiry_window = today + timedelta(days=30)
        return Response({
            "total_members": qs.count(),
            "active_members": qs.filter(membership_status="active").count(),
            "pending_renewals": qs.filter(membership_status="pending").count(),
            "expiring_soon": qs.filter(
                membership_status="active",
                membership_expiry__lte=expiry_window,
                membership_expiry__gte=today,
            ).count(),
        })

    @action(detail=True, methods=["get"], url_path="competition-history")
    def competition_history(self, request, pk=None):
        """Return Skater-Stats competition history; enforce COPPA consent for minors."""
        skater = self.get_object()

        if skater.is_minor and not ConsentRecord.has_active_consent(
            skater, ConsentRecord.CONSENT_COMPETITION_DATA
        ):
            return Response(
                {"detail": "Competition data consent not granted."},
                status=403,
            )

        data = skater.get_competition_history()
        if data is None:
            return Response(status=204)
        return Response(data)

    @action(detail=True, methods=["post"], url_path="renew", permission_classes=[IsAuthenticated])
    def renew(self, request, pk=None):
        """Renew an existing skater's membership — creates a new Stripe Checkout session."""
        skater = self.get_object()
        club = self._get_club()

        membership_type_id = request.data.get("membership_type_id")
        if not membership_type_id:
            raise ValidationError({"membership_type_id": "This field is required."})

        try:
            membership_type = MembershipType.objects.get(
                id=membership_type_id, club=club, is_active=True
            )
        except MembershipType.DoesNotExist:
            raise ValidationError({"membership_type_id": "Invalid membership type."})

        try:
            from django.db import transaction
            with transaction.atomic():
                payment = Payment.objects.create(
                    club=club,
                    payer=request.user,
                    payment_type="membership",
                    status="pending",
                    amount=membership_type.price_in_club,
                    currency="usd",
                    description=f"{membership_type.name} renewal — {skater.full_name}",
                )

                unit_amount = int(Decimal(str(membership_type.price_in_club)) * 100)
                session = stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    mode="payment",
                    line_items=[{
                        "price_data": {
                            "currency": "usd",
                            "product_data": {"name": f"{membership_type.name} — {skater.full_name}"},
                            "unit_amount": unit_amount,
                        },
                        "quantity": 1,
                    }],
                    metadata={
                        "skater_id": str(skater.id),
                        "membership_type_id": str(membership_type.id),
                        "club_id": str(club.id),
                        "payment_id": str(payment.id),
                    },
                    success_url=f"{settings.FRONTEND_URL}/register/success?session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{settings.FRONTEND_URL}/dashboard/members/{skater.id}",
                )

                payment.stripe_checkout_session_id = session.id
                payment.save(update_fields=["stripe_checkout_session_id"])

                skater.membership_type = membership_type
                skater.membership_status = "pending"
                skater.save(update_fields=["membership_type", "membership_status"])

        except stripe.error.StripeError as exc:
            raise ValidationError({"stripe": str(exc)}) from exc

        return Response({
            "checkout_url": session.url,
            "payment_id": str(payment.id),
        }, status=201)

    @action(
        detail=False,
        methods=["get"],
        url_path="export-usfs-csv",
        permission_classes=[IsClubAdmin],
    )
    def export_usfs_csv(self, request):
        """Generate and download a USFS-format CSV of active members."""
        club = request.club
        skaters = (
            self.get_queryset()
            .filter(membership_status="active")
            .select_related("membership_type")
        )

        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=USFS_CSV_COLUMNS)
        writer.writeheader()

        member_count = 0
        for skater in skaters:
            dob = skater.date_of_birth
            writer.writerow(
                {
                    "FirstName": skater.first_name,
                    "LastName": skater.last_name,
                    "DateOfBirth": dob.strftime("%m/%d/%Y") if dob else "",
                    "Email": skater.email,
                    "AddressLine1": skater.address_line1,
                    "AddressLine2": skater.address_line2,
                    "City": skater.city,
                    "State": skater.state,
                    "ZipCode": skater.zip_code,
                    "Phone": skater.phone,
                    "MembershipType": (
                        skater.membership_type.usfs_category
                        if skater.membership_type
                        else ""
                    ),
                    "USFSNumber": skater.usfs_number,
                    "MembershipStatus": skater.membership_status,
                }
            )
            member_count += 1
        AuditLog.objects.create(
            club=club,
            actor=request.user,
            action="usfs_export.generated",
            metadata={"member_count": member_count, "club": club.slug},
        )

        today = date.today().strftime("%Y-%m-%d")
        filename = f"usfs_export_{club.slug}_{today}.csv"

        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
