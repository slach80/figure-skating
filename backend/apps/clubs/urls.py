from django.urls import path

from apps.clubs.views import ClubMeView, MembershipTypeDetailView, MembershipTypeListCreateView

urlpatterns = [
    path('me/', ClubMeView.as_view(), name='club-me'),
    path('me/membership-types/', MembershipTypeListCreateView.as_view(), name='membership-type-list-create'),
    path('me/membership-types/<uuid:pk>/', MembershipTypeDetailView.as_view(), name='membership-type-detail'),
]
