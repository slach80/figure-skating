from rest_framework.permissions import BasePermission


class IsClubAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and hasattr(request, "club")
            and request.user.club == request.club
            and request.user.role in ("admin", "super_admin")
        )


class IsCoach(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and hasattr(request, "club")
            and request.user.club == request.club
            and request.user.role in ("coach", "admin", "super_admin")
        )


class IsClubMember(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and hasattr(request, "club")
            and request.user.club == request.club
        )


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "super_admin"


class IsGuardianOf(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        if hasattr(request, "club") and request.user.club == request.club and request.user.role in ("admin", "super_admin"):
            return True
        return obj.managed_by == request.user
