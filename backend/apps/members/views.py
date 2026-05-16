import csv
import io
from datetime import date

from django.http import HttpResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.mixins import ClubScopedViewMixin
from apps.common.models import AuditLog
from apps.common.permissions import IsClubAdmin
from apps.members.models import ConsentRecord, Skater
from apps.members.serializers import SkaterDetailSerializer, SkaterListSerializer

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
    """CRUD API for Skater records, scoped to request.club."""

    serializer_class = SkaterDetailSerializer

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
