import uuid
from django.db import models
from apps.common.models import ClubScopedModel


class WaiverTemplate(ClubScopedModel):
    """A versioned waiver document that members must sign each season."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    body = models.TextField(help_text="Waiver content — HTML or Markdown")
    version = models.CharField(max_length=20, help_text="e.g., '2025-v1'")
    requires_guardian_signature = models.BooleanField(
        default=True,
        help_text="If True, minors (under 13) must be signed by their guardian (managed_by).",
    )
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["title", "-version"]
        indexes = [
            models.Index(fields=["club", "is_active"]),
        ]

    def __str__(self):
        return f"{self.title} (v{self.version}) — {self.club}"


class WaiverSignature(models.Model):
    """An immutable record that a specific skater signed a waiver for a given season."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        WaiverTemplate,
        on_delete=models.PROTECT,
        related_name="signatures",
    )
    skater = models.ForeignKey(
        "members.Skater",
        on_delete=models.PROTECT,
        related_name="waiver_signatures",
    )
    signed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="waiver_signatures",
    )
    signed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    agreed = models.BooleanField()
    season_year = models.PositiveSmallIntegerField(
        help_text="Season year, e.g. 2025 for the 2025-2026 season."
    )

    class Meta:
        ordering = ["-signed_at"]
        unique_together = [("template", "skater", "season_year")]
        indexes = [
            models.Index(fields=["skater", "season_year"]),
            models.Index(fields=["template", "season_year"]),
        ]

    def __str__(self):
        return f"{self.skater} signed '{self.template.title}' ({self.season_year}) by {self.signed_by}"
