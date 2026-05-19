from rest_framework.exceptions import PermissionDenied


class ClubScopedViewMixin:
    """Ensures all ViewSet queries are scoped to request.club.

    Middleware sets request.club before DRF JWT auth runs, so for JWT requests
    the middleware resolves club=None. This mixin re-resolves from request.user
    (which DRF has populated by view time) if middleware left club as None.
    """

    def _get_club(self):
        club = getattr(self.request, "club", None)
        if club is None and self.request.user.is_authenticated:
            club = getattr(self.request.user, "club", None)
            self.request.club = club  # cache for this request
        return club

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user and user.is_authenticated and getattr(user, "role", None) == "super_admin":
            return qs  # super_admin sees all records across clubs
        club = self._get_club()
        if club is None:
            raise PermissionDenied("Club context required.")
        return qs.filter(club=club)

    def perform_create(self, serializer):
        club = self._get_club()
        if club is None:
            raise PermissionDenied("Club context required.")
        serializer.save(club=club)
