import uuid
from django.db import models
from apps.common.models import ClubScopedModel


class Payment(ClubScopedModel):
    """Record of a completed payment. Never deleted — financial audit trail."""

    STATUS_PENDING = "pending"
    STATUS_SUCCEEDED = "succeeded"
    STATUS_FAILED = "failed"
    STATUS_REFUNDED = "refunded"
    STATUS_PARTIALLY_REFUNDED = "partially_refunded"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SUCCEEDED, "Succeeded"),
        (STATUS_FAILED, "Failed"),
        (STATUS_REFUNDED, "Refunded"),
        (STATUS_PARTIALLY_REFUNDED, "Partially Refunded"),
    ]

    TYPE_MEMBERSHIP = "membership"
    TYPE_LESSON = "lesson"
    TYPE_TEST_SESSION = "test_session"
    TYPE_ICE_SESSION = "ice_session"
    TYPE_CHOICES = [
        (TYPE_MEMBERSHIP, "Membership"),
        (TYPE_LESSON, "Lesson"),
        (TYPE_TEST_SESSION, "Test Session"),
        (TYPE_ICE_SESSION, "Ice Session"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payer = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="payments"
    )
    payment_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_PENDING)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    description = models.CharField(max_length=500, blank=True)

    # Stripe identifiers
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True, db_index=True)
    stripe_checkout_session_id = models.CharField(max_length=100, blank=True, db_index=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True, db_index=True)

    # Discount tracking
    subtotal_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Pre-discount total; equals amount when no discount applied",
    )
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    family_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="50% discount applied to skaters 2+ in a family registration",
    )

    # Refund tracking
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["club", "payer", "created_at"]),
            models.Index(fields=["club", "payment_type", "status"]),
        ]

    def __str__(self):
        return f"{self.payment_type} ${self.amount} by {self.payer} — {self.status}"


class StripeEvent(models.Model):
    """Deduplication log for processed Stripe webhook events."""

    stripe_event_id = models.CharField(max_length=100, primary_key=True)
    event_type = models.CharField(max_length=100)
    processed_at = models.DateTimeField(auto_now_add=True)
    raw_payload = models.JSONField(default=dict)

    class Meta:
        ordering = ["-processed_at"]

    def __str__(self):
        return f"{self.event_type} — {self.stripe_event_id}"


# Register discount models with this app so they appear in payments migrations
from apps.payments.discount_models import DiscountCode, DiscountCodeUse  # noqa: E402, F401
