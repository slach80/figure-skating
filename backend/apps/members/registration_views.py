from datetime import date
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
import urllib.parse
import urllib.request

from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import FamilyGroup
from apps.accounts.models import User
from apps.members.models import MembershipType, Skater
from apps.payments.models import Payment
from apps.payments.discount_models import DiscountCode, DiscountCodeUse

FAMILY_ADDITIONAL_DISCOUNT = Decimal("50")  # 50% off skaters 2+

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
    if club is None:
        # Public endpoints (registration) — fall back to the single club on this platform
        from apps.clubs.models import Club
        club = Club.objects.filter(is_active=True).first()
        request.club = club
    return club


class MembershipTypeSerializer(serializers.ModelSerializer):
    family_additional_discount_pct = serializers.SerializerMethodField()

    def get_family_additional_discount_pct(self, obj):
        return str(FAMILY_ADDITIONAL_DISCOUNT)

    class Meta:
        model = MembershipType
        fields = ["id", "name", "usfs_category", "price_in_club", "price_out_of_club", "is_family_plan", "family_additional_discount_pct"]


class MembershipTypeListView(ListAPIView):
    serializer_class = MembershipTypeSerializer
    permission_classes = [AllowAny]

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
    usfs_number = serializers.CharField(required=False, allow_blank=True, default="")
    is_us_citizen = serializers.BooleanField(required=False, allow_null=True, default=None)
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
                    usfs_number=data.get("usfs_number", ""),
                    is_us_citizen=data.get("is_us_citizen"),
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

                if settings.STRIPE_TEST_MODE:
                    fake_session_id = f"fake_{skater.id}_single"
                    payment.stripe_checkout_session_id = fake_session_id
                    payment.save(update_fields=["stripe_checkout_session_id"])
                    checkout_url = f"{settings.FRONTEND_URL}/fake-checkout?payment_id={payment.id}"
                else:
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
                    checkout_url = session.url

        except stripe.error.StripeError as exc:
            raise ValidationError({"stripe": str(exc)}) from exc

        return Response({
            "skater_id": str(skater.id),
            "checkout_url": checkout_url,
            "payment_id": str(payment.id),
        }, status=201)


class SkaterRegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    date_of_birth = serializers.DateField()
    gender = serializers.ChoiceField(choices=["F", "M", "X"], required=False, allow_blank=True)
    usfs_number = serializers.CharField(required=False, allow_blank=True, default="")
    is_us_citizen = serializers.BooleanField(required=False, allow_null=True, default=None)
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
    discount_code = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_skaters(self, value):
        club = self.context["club"]
        validated = []
        for i, skater_data in enumerate(value):
            s = SkaterRegistrationSerializer(data=skater_data, context={"club": club})
            if not s.is_valid():
                raise ValidationError({f"skaters[{i}]": s.errors})
            validated.append(s.validated_data)
        return validated

    def validate_discount_code(self, value):
        if not value:
            return None
        club = self.context["club"]
        payer = self.context["request"].user
        code = value.strip().upper()
        try:
            dc = DiscountCode.objects.get(club=club, code=code)
        except DiscountCode.DoesNotExist:
            raise ValidationError("Invalid discount code.")
        valid, msg = dc.is_valid_for_payer(payer)
        if not valid:
            raise ValidationError(msg)
        return dc


class ValidateDiscountCodeView(APIView):
    """Validate a discount code and return the computed discount for a given subtotal."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        club = _resolve_club(request)
        code_str = request.data.get("code", "").strip().upper()
        subtotal = request.data.get("subtotal")

        if not code_str:
            return Response({"valid": False, "error": "Code is required."}, status=400)
        try:
            subtotal = Decimal(str(subtotal))
        except Exception:
            return Response({"valid": False, "error": "Invalid subtotal."}, status=400)

        try:
            dc = DiscountCode.objects.get(club=club, code=code_str)
        except DiscountCode.DoesNotExist:
            return Response({"valid": False, "error": "Invalid discount code."})

        valid, msg = dc.is_valid_for_payer(request.user)
        if not valid:
            return Response({"valid": False, "error": msg})

        if dc.min_purchase_amount and subtotal < dc.min_purchase_amount:
            return Response({
                "valid": False,
                "error": f"Minimum purchase of ${dc.min_purchase_amount} required.",
            })

        discount = dc.compute_discount(subtotal)
        return Response({
            "valid": True,
            "discount_type": dc.discount_type,
            "value": str(dc.value),
            "discount_amount": str(discount),
            "final_amount": str(subtotal - discount),
            "description": dc.description,
        })


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
        discount_code: DiscountCode | None = serializer.validated_data.get("discount_code")

        # ── Pricing: 50% off skaters 2+ (family discount) ───────────────────
        line_prices = []
        for i, sd in enumerate(skaters_data):
            base = Decimal(str(sd["membership_type"].price_in_club))
            if i == 0:
                line_prices.append((base, Decimal("0")))  # (charged, family_discount)
            else:
                family_disc = (base * FAMILY_ADDITIONAL_DISCOUNT / Decimal("100")).quantize(Decimal("0.01"))
                line_prices.append((base - family_disc, family_disc))

        subtotal = sum(p[0] for p in line_prices)
        total_family_discount = sum(p[1] for p in line_prices)

        # ── Promo code discount applied on top of family pricing ─────────────
        promo_discount = Decimal("0")
        if discount_code:
            if discount_code.min_purchase_amount and subtotal < discount_code.min_purchase_amount:
                raise ValidationError({
                    "discount_code": f"Minimum purchase of ${discount_code.min_purchase_amount} required."
                })
            promo_discount = discount_code.compute_discount(subtotal)

        final_amount = subtotal - promo_discount

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
                        usfs_number=sd.get("usfs_number", ""),
                        is_us_citizen=sd.get("is_us_citizen"),
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
                    amount=final_amount,
                    subtotal_amount=subtotal,
                    discount_amount=promo_discount,
                    family_discount_amount=total_family_discount,
                    currency="usd",
                    description=description_parts[:500],
                )

                # Record promo code use (pending until payment confirmed)
                if discount_code:
                    DiscountCodeUse.objects.create(
                        code=discount_code,
                        payer=request.user,
                        payment=payment,
                        original_amount=subtotal,
                        discount_amount=promo_discount,
                        final_amount=final_amount,
                        status=DiscountCodeUse.STATUS_PENDING,
                    )

                if settings.STRIPE_TEST_MODE:
                    fake_session_id = f"fake_{skater_ids_str}_family"
                    payment.stripe_checkout_session_id = fake_session_id
                    payment.save(update_fields=["stripe_checkout_session_id"])
                    checkout_url = f"{settings.FRONTEND_URL}/fake-checkout?payment_id={payment.id}"
                else:
                    # Build line items: each skater at their discounted price
                    line_items = []
                    for (charged, fam_disc), s, mt in zip(line_prices, skaters, membership_types):
                        name = f"{mt.name} — {s.full_name}"
                        if fam_disc > 0:
                            name += f" (50% family discount)"
                        line_items.append({
                            "price_data": {
                                "currency": "usd",
                                "product_data": {"name": name},
                                "unit_amount": int(charged * 100),
                            },
                            "quantity": 1,
                        })
                    # Promo discount as a negative line item
                    if promo_discount > 0:
                        line_items.append({
                            "price_data": {
                                "currency": "usd",
                                "product_data": {"name": f"Promo code: {discount_code.code}"},
                                "unit_amount": -int(promo_discount * 100),
                            },
                            "quantity": 1,
                        })

                    session = stripe.checkout.Session.create(
                        payment_method_types=["card"],
                        mode="payment",
                        line_items=line_items,
                        metadata={
                            "skater_ids": skater_ids_str,
                            "family_group_id": str(family_group.id),
                            "payment_id": str(payment.id),
                            "club_id": str(club.id),
                            "discount_code": discount_code.code if discount_code else "",
                        },
                        success_url=f"{settings.FRONTEND_URL}/register/success?session_id={{CHECKOUT_SESSION_ID}}",
                        cancel_url=f"{settings.FRONTEND_URL}/register/cancel",
                    )
                    payment.stripe_checkout_session_id = session.id
                    payment.save(update_fields=["stripe_checkout_session_id"])
                    checkout_url = session.url

        except stripe.error.StripeError as exc:
            raise ValidationError({"stripe": str(exc)}) from exc

        return Response({
            "family_group_id": str(family_group.id),
            "skater_ids": [str(s.id) for s in skaters],
            "checkout_url": checkout_url,
            "payment_id": str(payment.id),
            "subtotal_amount": str(subtotal),
            "family_discount_amount": str(total_family_discount),
            "promo_discount_amount": str(promo_discount),
            "total_amount": str(final_amount),
        }, status=201)


class ValidateAddressView(APIView):
    """Proxy the US Census Geocoder to avoid CORS issues from the browser."""
    permission_classes = [AllowAny]

    def post(self, request):
        import json as _json
        street = request.data.get("street", "").strip()
        city   = request.data.get("city", "").strip()
        state  = request.data.get("state", "").strip()
        zip_   = request.data.get("zip", "").strip()

        if not street or not city or not state:
            return Response({"valid": False, "error": "Missing required fields"}, status=400)

        params = urllib.parse.urlencode({
            "street": street,
            "city": city,
            "state": state,
            "zip": zip_,
            "benchmark": "Public_AR_Current",
            "format": "json",
        })
        url = f"https://geocoding.geo.census.gov/geocoder/locations/address?{params}"

        try:
            with urllib.request.urlopen(url, timeout=8) as resp:
                data = _json.loads(resp.read())
        except Exception:
            # Network failure — pass through so registration is never blocked
            return Response({"valid": True, "skipped": True})

        matches = data.get("result", {}).get("addressMatches", [])
        if not matches:
            return Response({"valid": False})

        m = matches[0]
        parts = m.get("matchedAddress", "").split(",")
        normalized = {
            "line1": parts[0].strip() if parts else street,
            "city":  m.get("addressComponents", {}).get("city", city),
            "state": m.get("addressComponents", {}).get("state", state),
            "zip":   m.get("addressComponents", {}).get("zip", zip_),
        }
        return Response({"valid": True, "normalized": normalized})
