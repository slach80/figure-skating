from django.urls import path
from .views import BroadcastEmailView, PushSubscribeView, PushUnsubscribeView

urlpatterns = [
    path("broadcast/", BroadcastEmailView.as_view(), name="broadcast-email"),
    path("push/subscribe/", PushSubscribeView.as_view(), name="push-subscribe"),
    path("push/unsubscribe/", PushUnsubscribeView.as_view(), name="push-unsubscribe"),
]
