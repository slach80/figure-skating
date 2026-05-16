from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clubs.models import Club
from apps.members.models import MembershipType


class ClubSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'slug', 'email', 'phone',
            'address', 'city', 'state', 'zip_code', 'website_url',
            'primary_color', 'accent_color',
            'current_season_start', 'current_season_end', 'season_label',
            'stripe_onboarding_complete', 'payments_enabled',
        ]
        read_only_fields = ['id', 'slug', 'stripe_onboarding_complete', 'payments_enabled']


class ClubMeView(RetrieveUpdateAPIView):
    serializer_class = ClubSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'patch']

    def get_object(self):
        club = getattr(self.request, 'club', None)
        if club is None and self.request.user.is_authenticated:
            club = getattr(self.request.user, 'club', None)
        if club is None:
            raise PermissionDenied("No club context.")
        return club


class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        fields = [
            'id', 'name', 'usfs_category',
            'price_in_club', 'price_out_of_club',
            'is_family_plan', 'is_active', 'sort_order',
        ]
        read_only_fields = ['id']


class MembershipTypeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_club(self, request):
        club = getattr(request, 'club', None)
        if club is None and request.user.is_authenticated:
            club = getattr(request.user, 'club', None)
        if club is None:
            raise PermissionDenied("No club context.")
        return club

    def get(self, request):
        club = self._get_club(request)
        qs = MembershipType.objects.filter(club=club).order_by('sort_order', 'name')
        return Response(MembershipTypeSerializer(qs, many=True).data)

    def post(self, request):
        club = self._get_club(request)
        serializer = MembershipTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(club=club)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MembershipTypeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_object(self, request, pk):
        club = getattr(request, 'club', None)
        if club is None and request.user.is_authenticated:
            club = getattr(request.user, 'club', None)
        if club is None:
            raise PermissionDenied("No club context.")
        try:
            return MembershipType.objects.get(pk=pk, club=club)
        except MembershipType.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound()

    def patch(self, request, pk):
        obj = self._get_object(request, pk)
        serializer = MembershipTypeSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        obj = self._get_object(request, pk)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
