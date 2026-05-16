from rest_framework.exceptions import PermissionDenied


class ClubScopedViewMixin:
    """Ensures all ViewSet queries are scoped to request.club."""

    def get_queryset(self):
        qs = super().get_queryset()
        if not hasattr(self.request, "club") or self.request.club is None:
            raise PermissionDenied("Club context required.")
        return qs.filter(club=self.request.club)

    def perform_create(self, serializer):
        if not hasattr(self.request, "club") or self.request.club is None:
            raise PermissionDenied("Club context required.")
        serializer.save(club=self.request.club)
