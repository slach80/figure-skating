from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/clubs/", include("apps.clubs.urls")),
    path("api/v1/members/", include("apps.members.urls")),
    path("api/v1/scheduling/", include("apps.scheduling.urls")),
    path("api/v1/competitions/", include("apps.competitions.urls")),
    path("api/v1/ice/", include("apps.ice.urls")),
    path("api/v1/payments/", include("apps.payments.urls")),
    path("api/v1/website/", include("apps.website.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("accounts/", include("allauth.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
