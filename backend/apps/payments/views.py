from rest_framework.generics import ListAPIView
from rest_framework.views import APIView
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.payments.models import Payment


def _resolve_club(request):
    club = getattr(request, "club", None)
    if club is None and request.user.is_authenticated:
        club = getattr(request.user, "club", None)
        request.club = club
    return club


class PaymentSerializer(serializers.ModelSerializer):
    payer_email = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_type",
            "status",
            "amount",
            "currency",
            "description",
            "stripe_checkout_session_id",
            "created_at",
            "payer_email",
        ]

    def get_payer_email(self, obj):
        return obj.payer.email


class PaymentListView(ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        club = _resolve_club(self.request)
        if club is None:
            raise PermissionDenied("Club context required.")

        qs = Payment.objects.filter(club=club).order_by("-created_at")

        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)

        payment_type = self.request.query_params.get("payment_type")
        if payment_type:
            qs = qs.filter(payment_type=payment_type)

        return qs


class MemberPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_type",
            "status",
            "amount",
            "currency",
            "description",
            "created_at",
            "stripe_receipt_url",
        ]


class MyPaymentsView(APIView):
    """Returns payments made by the currently authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Payment.objects.filter(payer=request.user).order_by("-created_at")
        serializer = MemberPaymentSerializer(qs, many=True)
        return Response({"results": serializer.data})
