from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.payments.webhooks import stripe_webhook
from apps.payments.views import PaymentListView, MyPaymentsView

router = DefaultRouter()

urlpatterns = [
    path("webhook/stripe/", stripe_webhook, name="stripe-webhook"),
    path("me/", MyPaymentsView.as_view(), name="my-payments"),
    path("", PaymentListView.as_view(), name="payment-list"),
    path("", include(router.urls)),
]
