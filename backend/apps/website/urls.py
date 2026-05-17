from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SiteConfigView,
    SiteConfigAdminView,
    PublicCoachListView,
    AnnouncementListView,
    AnnouncementAdminViewSet,
)

router = DefaultRouter()
router.register(r'admin/announcements', AnnouncementAdminViewSet, basename='announcement-admin')

urlpatterns = [
    path('config/', SiteConfigView.as_view(), name='site-config-public'),
    path('admin/config/', SiteConfigAdminView.as_view(), name='site-config-admin'),
    path('coaches/', PublicCoachListView.as_view(), name='public-coaches'),
    path('announcements/', AnnouncementListView.as_view(), name='public-announcements'),
    path('', include(router.urls)),
]
