from datetime import date
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import FamilyGroup
from apps.accounts.models import User
from apps.members.models import MembershipType, Skater
from apps.payments.models import Payment

stripe.api_key = settings.STRIPE_SECRET_KEY


def _get_or_create_member_user(email: str, first_name: str, last_name: str, club) -> "User | None":
    """Create a member-role User for a skater email if one doesn't exist yet."""
    if not email:
        return None
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "first_name": first_name,
            "last_name": last_name,
            "club": club,
            "role": User.ROLE_MEMBER,
        },
    )
    if created:
        # Set an unusable password — member must use "forgot password" to set their own
        user.set_unusable_password()
        user.save(update_fields=["password"])
    return user


def _resolve_club(request):
    club = getattr(request, "club", None)
    if club is None and request.user.is_authenticated:
        club = getattr(request.user, "club", None)
        request.club = club
    return club


class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        fields = ["id", "name", "usfs_category", "price_in_club", "price_out_of_club", "is_family_plan"]


class MembershipTypeListView(ListAPIView):
    serializer_class = MembershipTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        club = _resolve_club(self.request)
        if club is None:
            raise PermissionDenied("Club context required.")
        return MembershipType.objects.filter(club=club, is_active=True).order_by("sort_order")


class RegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    date_of_birth = serializers.DateField()
    gender = serializers.ChoiceField(choices=["F", "M", "X"], required=False, allow_blank=True)
    address_line1 = serializers.CharField()
    address_line2 = serializers.CharField(required=False, allow_blank=True, default="")
    city = serializers.CharField()
    state = serializers.CharField()
    zip_code = serializers.CharField()
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    membership_type_id = serializers.UUIDField()
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True, default="")
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True, default="")
    emergency_contact_relation = serializers.CharField(required=False, allow_blank=True, default="")
    is_primary_contact_billing = serializers.BooleanField(default=False)

    def validate_date_of_birth(self, value):
        if value >= date.today():
            raise ValidationError("Date of birth must be in the past.")
        return value

    def validate(self, attrs):
        club = self.context["request"].club
        membership_type_id = attrs["membership_type_id"]
        try:
            membership_type = MembershipType.objects.get(
                id=membership_type_id, club=club, is_active=True
            )
        except MembershipType.DoesNotExist:
            raise ValidationError({"membership_type_id": "Invalid or inactive membership type for this club."})
        attrs["membership_type"] = membership_type
        return attrs


class RegistrationView(CreateAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        club = _resolve_club(request)
        if club is None:
            raise PermissionDenied("Club context required.")
        request.club = club

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        membership_type = data["membership_type"]

        today = date.today()
        dob = data["date_of_birth"]
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        is_minor = age < 13

        try:
            with transaction.atomic():
                email_addr = data.get("email", "")
                member_user = None if is_minor else _get_or_create_member_user(
                    email_addr, data["first_name"], data["last_name"], club
                )
                skater = Skater.objects.create(
                    club=club,
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    date_of_birth=dob,
                    gender=data.get("gender", ""),
                    address_line1=data["address_line1"],
                    address_line2=data.get("address_line2", ""),
                    city=data["city"],
                    state=data["state"],
                    zip_code=data["zip_code"],
                    phone=data.get("phone", ""),
                    email=email_addr,
                    membership_type=membership_type,
                    membership_status="pending",
                    managed_by=request.user if is_minor else None,
                    user=member_user,
                    emergency_contact_name=data.get("emergency_contact_name", ""),
                    emergency_contact_phone=data.get("emergency_contact_phone", ""),
                    emergency_contact_relation=data.get("emergency_contact_relation", ""),
                )

                payment = Payment.objects.create(
                    club=club,
                    payer=request.user,
                    payment_type="membership",
                    status="pending",
                    amount=membership_type.price_in_club,
                    currency="usd",
                    description=f"{membership_type.name} — {skater.full_name}",
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
                    cancel_url=f"{settings.FRONTEND_URL}/register/cancel",
                )

                payment.stripe_checkout_session_id = session.id
                payment.save(update_fields=["stripe_checkout_session_id"])

        except stripe.error.StripeError as exc:
            raise ValidationError({"stripe": str(exc)}) from exc

        return Response({
            "skater_id": str(skater.id),
            "checkout_url": session.url,
            "payment_id": str(payment.id),
        }, status=201)


class SkaterRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    date_of_birth = serializers.DateField()
    gender = serializers.ChoiceField(choices=["F", "M", "X"], required=False, allow_blank=True)
    address_line1 = serializers.CharField()
    address_line2 = serializers.CharField(required=False, allow_blank=True, default="")
    city = serializers.CharField()
    state = serializers.CharField()
    zip_code = serializers.CharField()
    membership_type_id = serializers.UUIDField()
    emergency_contact_name = serializers.CharField(required=False, allow_blank=True, default="")
    emergency_contact_phone = serializers.CharField(required=False, allow_blank=True, default="")
    emergency_contact_relation = serializers.CharField(required=False, allow_blank=True, default="")
    coppa_consented = serializers.BooleanField(default=False)

    def validate_date_of_birth(self, value):
        if value >= date.today():
            raise ValidationError("Date of birth must be in the past.")
        return value

    def validate(self, attrs):
        club = self.context["club"]
        membership_type_id = attrs["membership_type_id"]
        try:
            membership_type = MembershipType.objects.get(
                id=membership_type_id, club=club, is_active=True
            )
        except MembershipType.DoesNotExist:
            raise ValidationError({"membership_type_id": "Invalid or inactive membership type for this club."})
        attrs["membership_type"] = membership_type

        today = date.today()
        dob = attrs["date_of_birth"]
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        if age < 13 and not attrs.get("coppa_consented"):
            raise ValidationError({"coppa_consented": "COPPA consent is required for skaters under 13."})

        return attrs


class FamilyRegistrationSerializer(serializers.Serializer):
    skaters = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=10,
    )

    def validate_skaters(self, value):
        club = self.context["club"]
        validated = []
        for i, skater_data in enumerate(value):
            s = SkaterRegistrationSerializer(data=skater_data, context={"club": club})
            if not s.is_valid():
                raise ValidationError({f"skaters[{i}]": s.errors})
            validated.append(s.validated_data)
        return validated


class FamilyRegistrationView(CreateAPIView):
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        club = _resolve_club(request)
        if club is None:
            raise PermissionDenied("Club context required.")
        request.club = club

        serializer = FamilyRegistrationSerializer(
            data=request.data, context={"request": request, "club": club}
        )
        serializer.is_valid(raise_exception=True)
        skaters_data = serializer.validated_data["skaters"]

        total_amount = sum(
            Decimal(str(sd["membership_type"].price_in_club)) for sd in skaters_data
        )

        try:
            with transaction.atomic():
                last_name = skaters_data[0]["last_name"]
                family_group = FamilyGroup.objects.create(
                    club=club,
                    name=f"The {last_name} Family",
                )

                skaters = []
                membership_types = []
                for sd in skaters_data:
                    mt = sd["membership_type"]
                    skater = Skater.objects.create(
                        club=club,
                        first_name=sd["first_name"],
                        last_name=sd["last_name"],
                        date_of_birth=sd["date_of_birth"],
                        gender=sd.get("gender", ""),
                        address_line1=sd["address_line1"],
                        address_line2=sd.get("address_line2", ""),
                        city=sd["city"],
                        state=sd["state"],
                        zip_code=sd["zip_code"],
                        membership_type=mt,
                        membership_status="pending",
                        managed_by=request.user,
                        family_group=family_group,
                        emergency_contact_name=sd.get("emergency_contact_name", ""),
                        emergency_contact_phone=sd.get("emergency_contact_phone", ""),
                        emergency_contact_relation=sd.get("emergency_contact_relation", ""),
                    )
                    skaters.append(skater)
                    membership_types.append(mt)

                skater_ids_str = ",".join(str(s.id) for s in skaters)
                description_parts = "; ".join(
                    f"{mt.name} — {s.full_name}"
                    for s, mt in zip(skaters, membership_types)
                )

                payment = Payment.objects.create(
                    club=club,
                    payer=request.user,
                    payment_type="membership",
                    status="pending",
                    amount=total_amount,
                    currency="usd",
                    description=description_parts[:500],
                )

                line_items = [
                    {
                        "price_data": {
                            "currency": "usd",
                            "product_data": {"name": f"{mt.name} — {s.full_name}"},
                            "unit_amount": int(Decimal(str(mt.price_in_club)) * 100),
                        },
                        "quantity": 1,
                    }
                    for s, mt in zip(skaters, membership_types)
                ]

                session = stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    mode="payment",
                    line_items=line_items,
                    metadata={
                        "skater_ids": skater_ids_str,
                        "family_group_id": str(family_group.id),
                        "payment_id": str(payment.id),
                        "club_id": str(club.id),
                    },
                    success_url=f"{settings.FRONTEND_URL}/register/success?session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{settings.FRONTEND_URL}/register/cancel",
                )

                payment.stripe_checkout_session_id = session.id
                payment.save(update_fields=["stripe_checkout_session_id"])

        except stripe.error.StripeError as exc:
            raise ValidationError({"stripe": str(exc)}) from exc

        return Response({
            "family_group_id": str(family_group.id),
            "skater_ids": [str(s.id) for s in skaters],
            "checkout_url": session.url,
            "payment_id": str(payment.id),
            "total_amount": str(total_amount),
        }, status=201)
