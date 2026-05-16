import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class FamilyGroup(models.Model):
    """Groups family members under one billing unit. One primary contact pays."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    club = models.ForeignKey("clubs.Club", on_delete=models.CASCADE)
    name = models.CharField(max_length=200, help_text="e.g., 'The Anderson Family'")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def primary_contact(self):
        return self.users.filter(is_primary_contact=True).first()


class User(AbstractUser):
    """Custom User model. Handles authentication only. Skating identity is on Skater."""

    ROLE_MEMBER = "member"
    ROLE_COACH = "coach"
    ROLE_ADMIN = "admin"
    ROLE_SUPER_ADMIN = "super_admin"
    ROLE_CHOICES = [
        (ROLE_MEMBER, "Member"),
        (ROLE_COACH, "Coach"),
        (ROLE_ADMIN, "Club Admin"),
        (ROLE_SUPER_ADMIN, "Super Admin"),
    ]

    # Replace username with email as primary identifier
    username = None
    email = models.EmailField(unique=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    club = models.ForeignKey(
        "clubs.Club",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="users",
    )
    family_group = models.ForeignKey(
        FamilyGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    is_primary_contact = models.BooleanField(
        default=False,
        help_text="This user is the billing contact for their family group."
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    phone = models.CharField(max_length=20, blank=True)

    # Stripe Customer ID (per Connected Account — one per club)
    stripe_customer_id = models.CharField(max_length=100, blank=True)

    # COPPA: track if this user has verified they are 13+
    age_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        indexes = [
            models.Index(fields=["club", "role"]),
            models.Index(fields=["family_group"]),
        ]

    def __str__(self):
        return self.email

    @property
    def is_club_admin(self):
        return self.role in (self.ROLE_ADMIN, self.ROLE_SUPER_ADMIN)

    @property
    def is_coach(self):
        return self.role in (self.ROLE_COACH, self.ROLE_ADMIN, self.ROLE_SUPER_ADMIN)
