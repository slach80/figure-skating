from apps.clubs.models import Club


class ClubResolutionMiddleware:
    """
    Resolves request.club from (in order):
    1. X-Club-Slug header (for API testing / super-admin)
    2. Subdomain (linecreek.platform.com → Club slug 'linecreek')
    3. Authenticated user's club FK (fallback)

    Note: DRF JWT authentication runs at the view level, after all middleware.
    request.club is set to a lazy callable so it resolves after JWT auth populates
    request.user on the first access from a view. For most cases, the header or
    subdomain path is used instead.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.club = self._resolve_club(request)
        return self.get_response(request)

    def _resolve_club(self, request):
        # Header override (super-admin / API testing)
        slug = request.headers.get("X-Club-Slug")
        if slug:
            return Club.objects.filter(slug=slug, is_active=True).first()

        # Subdomain resolution
        host = request.get_host().split(":")[0]  # strip port
        parts = host.split(".")
        if len(parts) >= 3:
            subdomain = parts[0]
            club = Club.objects.filter(slug=subdomain, is_active=True).first()
            if club:
                return club

        # Authenticated user fallback — works for session auth.
        # For JWT (DRF), request.user is still AnonymousUser here; views using
        # ClubScopedViewMixin will call _resolve_club_from_jwt() if club is None.
        if hasattr(request, "user") and request.user.is_authenticated:
            return getattr(request.user, "club", None)

        return None
