from django.urls import path
from .views import BroadcastEmailView

urlpatterns = [
    path("broadcast/", BroadcastEmailView.as_view(), name="broadcast-email"),
]
