from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompetitionViewSet, EventCategoryViewSet, CompetitionEntryViewSet

router = DefaultRouter()
router.register('competitions', CompetitionViewSet, basename='competition')
router.register('categories', EventCategoryViewSet, basename='eventcategory')
router.register('entries', CompetitionEntryViewSet, basename='competitionentry')

urlpatterns = [
    path("", include(router.urls)),
]
