from rest_framework import serializers as drf_serializers, viewsets, status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import ClubScopedViewMixin
from apps.common.permissions import IsClubAdmin
from apps.scheduling.models import Coach
from apps.scheduling.serializers import CoachDetailSerializer
from .models import Announcement, SiteConfig
from .serializers import AnnouncementSerializer, SiteConfigSerializer


class SiteConfigView(APIView):
    """Public — returns site config for the first (only) club. Returns {} if not configured."""
    permission_classes = [AllowAny]

    def get(self, request):
        from apps.clubs.models import Club
        club = Club.objects.first()
        if club is None:
            return Response({})
        try:
            config = SiteConfig.objects.get(club=club)
            return Response(SiteConfigSerializer(config).data)
        except SiteConfig.DoesNotExist:
            return Response({})


class PublicCoachListView(ListAPIView):
    """Public — returns active coaches with bio and specialties."""
    permission_classes = [AllowAny]
    serializer_class = CoachDetailSerializer

    def get_queryset(self):
        from apps.clubs.models import Club
        club = Club.objects.first()
        if club is None:
            return Coach.objects.none()
        return Coach.objects.filter(club=club, is_active=True).select_related('user')


class AnnouncementListView(ListAPIView):
    """Public — returns published announcements."""
    permission_classes = [AllowAny]
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        from apps.clubs.models import Club
        club = Club.objects.first()
        if club is None:
            return Announcement.objects.none()
        return Announcement.objects.filter(club=club, is_published=True)


# ── Admin-only management views ───────────────────────────────────────────────

class SiteConfigAdminView(APIView):
    """Admin — GET or PUT/PATCH the club's site config."""
    permission_classes = [IsClubAdmin]

    def _get_club(self):
        club = getattr(self.request, 'club', None)
        if club is None and self.request.user.is_authenticated:
            club = getattr(self.request.user, 'club', None)
        return club

    def get(self, request):
        club = self._get_club()
        try:
            config = SiteConfig.objects.get(club=club)
            return Response(SiteConfigSerializer(config).data)
        except SiteConfig.DoesNotExist:
            return Response({})

    def patch(self, request):
        club = self._get_club()
        config, _ = SiteConfig.objects.get_or_create(club=club)
        serializer = SiteConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)


class AnnouncementAdminViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    """Admin — CRUD for announcements."""
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsClubAdmin()]
        return [IsAuthenticated()]
