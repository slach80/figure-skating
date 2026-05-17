from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CoachViewSet,
    LessonTypeViewSet,
    AvailabilitySlotViewSet,
    BookingViewSet,
    CoachEvaluationViewSet,
    LessonPackageViewSet,
    PurchasedPackageViewSet,
    TestSessionViewSet,
    TestRegistrationViewSet,
)

router = DefaultRouter()
router.register(r"coaches", CoachViewSet, basename="coach")
router.register(r"lesson-types", LessonTypeViewSet, basename="lessontype")
router.register(r"slots", AvailabilitySlotViewSet, basename="availabilityslot")
router.register(r"bookings", BookingViewSet, basename="booking")
router.register(r"evaluations", CoachEvaluationViewSet, basename="evaluations")
router.register(r"packages", LessonPackageViewSet, basename="lesson-packages")
router.register(r"purchased-packages", PurchasedPackageViewSet, basename="purchased-packages")
router.register(r"test-sessions", TestSessionViewSet, basename="test-sessions")
router.register(r"test-registrations", TestRegistrationViewSet, basename="test-registrations")

urlpatterns = [
    path("", include(router.urls)),
]
