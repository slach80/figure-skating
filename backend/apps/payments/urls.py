from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.payments.webhooks import stripe_webhook

router = DefaultRouter()

urlpatterns = [
    path("webhook/stripe/", stripe_webhook, name="stripe-webhook"),
    path("", include(router.urls)),
]
