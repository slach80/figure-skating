from django.urls import path
from apps.waivers.views import WaiverStatusView, WaiverTemplateListView, WaiverSignView

urlpatterns = [
    path("templates/", WaiverTemplateListView.as_view(), name="waiver-template-list"),
    path("sign/", WaiverSignView.as_view(), name="waiver-sign"),
    path("status/", WaiverStatusView.as_view(), name="waiver-status"),
]
