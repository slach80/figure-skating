import uuid
from django.db import models
from apps.common.models import ClubScopedModel


class SiteConfig(ClubScopedModel):
    """Per-club public website configuration."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tagline = models.CharField(max_length=300, blank=True)
    about_text = models.TextField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    facebook_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    rink_name = models.CharField(max_length=200, blank=True)
    rink_address = models.TextField(blank=True)

    class Meta:
        unique_together = [['club']]

    def __str__(self):
        return f"SiteConfig for {self.club}"


class Announcement(ClubScopedModel):
    """News/announcement post for the public website."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    body = models.TextField()
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return self.title
