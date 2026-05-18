from datetime import date

from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsClubMember
from apps.members.models import Skater
from apps.waivers.models import WaiverSignature, WaiverTemplate
from apps.waivers.serializers import WaiverSignatureCreateSerializer, WaiverTemplateSerializer


def _get_client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


class WaiverTemplateListView(ListAPIView):
    """GET /api/v1/waivers/templates/ — list active waiver templates for the club."""

    permission_classes = [IsClubMember]
    serializer_class = WaiverTemplateSerializer
    pagination_class = None

    def get_queryset(self):
        club = getattr(self.request, "club", None) or getattr(self.request.user, "club", None)
        return WaiverTemplate.objects.filter(club=club, is_active=True).order_by("title")


class WaiverSignView(APIView):
    """POST /api/v1/waivers/sign/ — record a waiver signature."""

    permission_classes = [IsClubMember]

    def post(self, request):
        serializer = WaiverSignatureCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        club = getattr(request, "club", None) or getattr(request.user, "club", None)

        # Resolve template — must belong to this club and be active
        try:
            template = WaiverTemplate.objects.get(
                id=data["template_id"], club=club, is_active=True
            )
        except WaiverTemplate.DoesNotExist:
            raise ValidationError({"template_id": "Waiver template not found or inactive."})

        # Resolve skater — must belong to this club
        try:
            skater = Skater.objects.get(id=data["skater_id"], club=club)
        except Skater.DoesNotExist:
            raise ValidationError({"skater_id": "Skater not found."})

        # Authorization: member can only sign for their own skater or one they manage
        user = request.user
        owns_skater = (
            (hasattr(skater, "user") and skater.user == user)
            or skater.managed_by == user
        )
        is_admin = user.role in ("admin", "super_admin")
        if not owns_skater and not is_admin:
            raise ValidationError({"skater_id": "You are not authorized to sign for this skater."})

        # For minors requiring guardian signature, signed_by must be managed_by
        if template.requires_guardian_signature and skater.is_minor:
            if skater.managed_by is None:
                raise ValidationError(
                    {"skater_id": "Minor skater has no guardian assigned. Contact club admin."}
                )
            if user != skater.managed_by and not is_admin:
                raise ValidationError(
                    {"signed_by": "This waiver must be signed by the skater's guardian."}
                )

        season_year = date.today().year
        ip_address = _get_client_ip(request)

        try:
            signature = WaiverSignature.objects.create(
                template=template,
                skater=skater,
                signed_by=user,
                ip_address=ip_address,
                agreed=data["agreed"],
                season_year=season_year,
            )
        except IntegrityError:
            raise ValidationError(
                {"detail": "This waiver has already been signed for this season."}
            )

        return Response(
            {
                "id": str(signature.id),
                "template_id": str(template.id),
                "skater_id": str(skater.id),
                "signed_at": signature.signed_at.isoformat(),
                "season_year": season_year,
            },
            status=201,
        )


class WaiverStatusView(APIView):
    """GET /api/v1/waivers/status/?skater=<uuid> — signed/unsigned status per template."""

    permission_classes = [IsClubMember]

    def get(self, request):
        skater_id = request.query_params.get("skater")
        if not skater_id:
            raise ValidationError({"skater": "This query parameter is required."})

        club = getattr(request, "club", None) or getattr(request.user, "club", None)

        try:
            skater = Skater.objects.get(id=skater_id, club=club)
        except Skater.DoesNotExist:
            raise ValidationError({"skater": "Skater not found."})

        # Authorization: must own or manage the skater, or be admin
        user = request.user
        owns_skater = (
            (hasattr(skater, "user") and skater.user == user)
            or skater.managed_by == user
        )
        is_admin = user.role in ("admin", "super_admin")
        if not owns_skater and not is_admin:
            raise ValidationError({"skater": "You are not authorized to view waivers for this skater."})

        season_year = date.today().year
        templates = WaiverTemplate.objects.filter(club=club, is_active=True)

        # Build a lookup of signed templates for this skater this season
        signed_map: dict[str, WaiverSignature] = {
            str(sig.template_id): sig
            for sig in WaiverSignature.objects.filter(
                template__in=templates,
                skater=skater,
                season_year=season_year,
            ).select_related("template")
        }

        result = []
        for tmpl in templates:
            sig = signed_map.get(str(tmpl.id))
            result.append(
                {
                    "template_id": str(tmpl.id),
                    "title": tmpl.title,
                    "version": tmpl.version,
                    "requires_guardian_signature": tmpl.requires_guardian_signature,
                    "signed": sig is not None,
                    "signed_at": sig.signed_at.isoformat() if sig else None,
                    "signed_by": str(sig.signed_by_id) if sig else None,
                }
            )

        return Response(result)
