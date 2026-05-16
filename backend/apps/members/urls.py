from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.members.views import SkaterViewSet
from apps.members.registration_views import FamilyRegistrationView, MembershipTypeListView, RegistrationView

router = DefaultRouter()
router.register(r"", SkaterViewSet, basename="skater")

urlpatterns = [
    path("membership-types/", MembershipTypeListView.as_view(), name="membership-type-list"),
    path("register/", RegistrationView.as_view(), name="skater-register"),
    path("register/family/", FamilyRegistrationView.as_view(), name="family-register"),
    path("", include(router.urls)),
]
