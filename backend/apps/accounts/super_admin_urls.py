from django.urls import path

from apps.accounts.super_admin_views import (
    SuperAdminClubListView,
    SuperAdminImpersonateView,
    SuperAdminUserListView,
)

urlpatterns = [
    path("clubs/", SuperAdminClubListView.as_view(), name="super-admin-clubs"),
    path("users/", SuperAdminUserListView.as_view(), name="super-admin-users"),
    path("impersonate/", SuperAdminImpersonateView.as_view(), name="super-admin-impersonate"),
]
