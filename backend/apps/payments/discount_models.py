import uuid
from decimal import Decimal

from django.db import models
from django.utils import timezone

from apps.common.models import ClubScopedModel


class DiscountCode(ClubScopedModel):
    """Club-managed promotional codes. Adapted from hustle-kit discount module."""

    TYPE_PERCENT = "percent"
    TYPE_FIXED = "fixed"
    TYPE_CHOICES = [
        (TYPE_PERCENT, "Percentage"),
        (TYPE_FIXED, "Fixed Amount"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, db_index=True)
    description = models.CharField(max_length=200, blank=True)
    discount_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_PERCENT)
    value = models.DecimalField(
        max_digits=8, decimal_places=2,
        help_text="Percentage (0–100) or fixed dollar amount",
    )
    max_uses = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Leave blank for unlimited uses",
    )
    max_uses_per_family = models.PositiveIntegerField(
        default=1,
        help_text="How many times one family/payer can use this code",
    )
    min_purchase_amount = models.DecimalField(
        max_digits=8, decimal_places=2,
        null=True, blank=True,
        help_text="Minimum order total before code applies",
    )
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="created_discount_codes",
    )

    class Meta:
        unique_together = [("club", "code")]
        ordering = ["code"]
        indexes = [
            models.Index(fields=["club", "code", "is_active"]),
        ]

    def __str__(self):
        return f"{self.code} ({self.club})"

    @property
    def use_count(self):
        return self.uses.filter(status="applied").count()

    def is_valid_now(self):
        if not self.is_active:
            return False, "This code is inactive."
        today = timezone.now().date()
        if self.valid_from and today < self.valid_from:
            return False, "This code is not yet active."
        if self.valid_until and today > self.valid_until:
            return False, "This code has expired."
        if self.max_uses is not None and self.use_count >= self.max_uses:
            return False, "This code has reached its usage limit."
        return True, ""

    def is_valid_for_payer(self, payer):
        valid, msg = self.is_valid_now()
        if not valid:
            return False, msg
        uses_by_payer = self.uses.filter(payer=payer, status="applied").count()
        if uses_by_payer >= self.max_uses_per_family:
            return False, "You have already used this code."
        return True, ""

    def compute_discount(self, subtotal: Decimal) -> Decimal:
        if self.discount_type == self.TYPE_PERCENT:
            discount = (subtotal * self.value / Decimal("100")).quantize(Decimal("0.01"))
        else:
            discount = self.value
        return min(discount, subtotal)


class DiscountCodeUse(models.Model):
    """Audit record for every discount code redemption."""

    STATUS_PENDING = "pending"
    STATUS_APPLIED = "applied"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_APPLIED, "Applied"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.ForeignKey(DiscountCode, on_delete=models.PROTECT, related_name="uses")
    payer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="discount_uses")
    payment = models.OneToOneField(
        "payments.Payment", on_delete=models.CASCADE,
        null=True, blank=True, related_name="discount_use",
    )
    original_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    used_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-used_at"]
        indexes = [
            models.Index(fields=["code", "status"]),
            models.Index(fields=["payer", "status"]),
        ]

    def __str__(self):
        return f"{self.code.code} — {self.payer} ${self.discount_amount} off"

    def confirm(self):
        self.status = self.STATUS_APPLIED
        self.confirmed_at = timezone.now()
        self.save(update_fields=["status", "confirmed_at"])

    def cancel(self):
        self.status = self.STATUS_CANCELLED
        self.save(update_fields=["status"])
