import uuid
from django.db import models


class Club(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, help_text="Used for subdomain routing (e.g., 'linecreek')")
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=2, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)
    website_url = models.URLField(blank=True)
    logo = models.ImageField(upload_to="clubs/logos/", null=True, blank=True)

    # Branding
    primary_color = models.CharField(max_length=7, default="#5B2C91", help_text="Hex color")
    accent_color = models.CharField(max_length=7, default="#D946EF", help_text="Hex color")

    # Stripe Connect
    stripe_account_id = models.CharField(
        max_length=100, blank=True,
        help_text="Stripe Connected Account ID (acct_...)"
    )
    stripe_onboarding_complete = models.BooleanField(default=False)

    # Season config
    current_season_start = models.DateField(null=True, blank=True)
    current_season_end = models.DateField(null=True, blank=True)
    season_label = models.CharField(max_length=20, blank=True, help_text="e.g., '2025-2026'")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def payments_enabled(self):
        return bool(self.stripe_account_id) and self.stripe_onboarding_complete
