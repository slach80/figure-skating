from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.urls import path, include
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django_ratelimit.decorators import ratelimit
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)

from apps.accounts.models import User
from django.conf import settings as django_settings


class ClubTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token


@method_decorator(ratelimit(key='ip', rate='10/m', method='POST', block=True), name='post')
class ClubTokenObtainPairView(TokenObtainPairView):
    serializer_class = ClubTokenSerializer


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class PasswordResetRequestView(APIView):
    """POST {email} → sends reset link to that address."""
    permission_classes = []

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        # Always return 200 to avoid email enumeration
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "If that email is registered, a reset link has been sent."})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{django_settings.FRONTEND_URL}/set-password?uid={uid}&token={token}"

        send_mail(
            subject="Reset your Line Creek FSC password",
            message=(
                f"Hi {user.first_name},\n\n"
                f"Click the link below to set your password:\n{reset_url}\n\n"
                "This link expires in 24 hours.\n"
            ),
            from_email="noreply@linecreekfsc.org",
            recipient_list=[user.email],
            fail_silently=True,
        )
        return Response({"detail": "If that email is registered, a reset link has been sent."})


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST', block=True), name='post')
class PasswordResetConfirmView(APIView):
    """POST {uid, token, password} → sets the new password."""
    permission_classes = []

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        password = request.data.get("password", "")

        if not uid or not token or not password:
            raise serializers.ValidationError("uid, token, and password are required.")

        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
        except (User.DoesNotExist, ValueError, TypeError):
            raise serializers.ValidationError("Invalid reset link.")

        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError("Reset link is invalid or has expired.")

        if len(password) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")

        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated successfully."})


router = DefaultRouter()

urlpatterns = [
    path("token/", ClubTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("", include(router.urls)),
]
