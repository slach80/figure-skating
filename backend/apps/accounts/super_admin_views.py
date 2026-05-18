from datetime import timedelta

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import User
from apps.accounts.super_admin_serializers import ClubListSerializer, UserListSerializer
from apps.clubs.models import Club
from apps.common.permissions import IsSuperAdmin


class SuperAdminClubListView(APIView):
    """GET /api/v1/super-admin/clubs/ — list all clubs."""

    permission_classes = [IsSuperAdmin]

    def get(self, request: Request) -> Response:
        clubs = Club.objects.all().order_by("name")
        serializer = ClubListSerializer(clubs, many=True)
        return Response(serializer.data)


class SuperAdminUserListView(APIView):
    """GET /api/v1/super-admin/users/ — list all users, optionally filtered by ?club=<uuid>."""

    permission_classes = [IsSuperAdmin]

    def get(self, request: Request) -> Response:
        qs = User.objects.select_related("club").order_by("email")
        club_id = request.query_params.get("club")
        if club_id:
            qs = qs.filter(club__id=club_id)
        serializer = UserListSerializer(qs, many=True)
        return Response(serializer.data)


class SuperAdminImpersonateView(APIView):
    """POST /api/v1/super-admin/impersonate/ — issue a 10-minute access token for another user."""

    permission_classes = [IsSuperAdmin]

    def post(self, request: Request) -> Response:
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "user_id is required."}, status=400)

        try:
            target = User.objects.get(uuid=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)

        token = AccessToken()
        token.set_exp(lifetime=timedelta(minutes=10))
        token["user_id"] = target.pk
        token["token_type"] = "access"
        token["role"] = target.role
        token["email"] = target.email

        return Response({"access": str(token)})
