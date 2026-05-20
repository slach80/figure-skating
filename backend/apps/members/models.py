import uuid
from django.db import models
from django.utils import timezone
from apps.common.models import ClubScopedModel, SoftDeleteModel


class MembershipType(ClubScopedModel):
    """Per-club membership tier (e.g., Adult, Juvenile, Collegiate, Family)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    usfs_category = models.CharField(
        max_length=50,
        blank=True,
        help_text="Exact USFS membership category string for CSV export"
    )
    price_in_club = models.DecimalField(max_digits=8, decimal_places=2)
    price_out_of_club = models.DecimalField(
        max_digits=8, decimal_places=2,
        help_text="Price for non-primary-club members"
    )
    is_family_plan = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_skating = models.BooleanField(
        default=True,
        help_text="Uncheck for non-skating members (e.g. parents, Associate Professional) to block ice/test session booking."
    )
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        unique_together = [("club", "name")]

    def __str__(self):
        return f"{self.name} ({self.club})"


class Skater(ClubScopedModel, SoftDeleteModel):
    """
    The USFS skating identity. One per person registered with US Figure Skating.
    A single User (parent) can manage multiple Skater records.
    """

    GENDER_FEMALE = "F"
    GENDER_MALE = "M"
    GENDER_OTHER = "X"
    GENDER_CHOICES = [
        (GENDER_FEMALE, "Female"),
        (GENDER_MALE, "Male"),
        (GENDER_OTHER, "Other / Prefer not to say"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Auth link — nullable for minors managed by a parent
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="skater_profile",
    )
    managed_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="managed_skaters",
        help_text="Parent/guardian for minors; null means skater manages own account.",
    )
    family_group = models.ForeignKey(
        "accounts.FamilyGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="skaters",
    )

    # Personal info (USFS-required fields)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    preferred_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True)

    # Contact (required for USFS registration)
    address_line1 = models.CharField(max_length=200)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    # USFS eligibility
    is_us_citizen = models.BooleanField(null=True, blank=True, help_text="U.S. citizenship status for USFS eligibility")

    # USFS registration
    usfs_number = models.CharField(max_length=20, blank=True, db_index=True)
    membership_type = models.ForeignKey(
        MembershipType,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="skaters",
    )
    membership_expiry = models.DateField(null=True, blank=True)
    membership_status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("active", "Active"),
            ("expired", "Expired"),
            ("suspended", "Suspended"),
        ],
        default="pending",
        db_index=True,
    )

    # Skater-Stats integration
    skater_stats_slug = models.CharField(
        max_length=100,
        blank=True,
        help_text="URL slug on skater-stats.com (e.g., 'emma-anderson')"
    )
    skater_stats_last_synced = models.DateTimeField(null=True, blank=True)

    # Emergency contact
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relation = models.CharField(max_length=100, blank=True)

    # Medical
    medical_notes = models.TextField(blank=True)

    # Pronunciation guide (from EntryEeze research)
    name_pronunciation = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["club", "membership_status"]),
            models.Index(fields=["usfs_number"]),
            models.Index(fields=["club", "last_name", "first_name"]),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_minor(self):
        from datetime import date
        today = date.today()
        age = today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )
        return age < 13

    @property
    def is_active_member(self):
        return (
            self.membership_status == "active"
            and self.membership_expiry is not None
            and self.membership_expiry >= timezone.now().date()
        )

    def get_competition_history(self):
        """Fetch competition history from Skater-Stats (cached in Redis)."""
        if not self.skater_stats_slug:
            return None
        from apps.competitions.services import SkaterStatsClient
        client = SkaterStatsClient()
        return client.get_skater(self.skater_stats_slug)


class SkaterLevel(ClubScopedModel):
    """Records a skater's current USFS level per discipline."""

    DISCIPLINE_MITF = 'moves'
    DISCIPLINE_FREESTYLE = 'freestyle'
    DISCIPLINE_DANCE = 'dance'
    DISCIPLINE_PAIRS = 'pairs'
    DISCIPLINE_CHOICES = [
        ('moves', 'Moves in the Field'),
        ('freestyle', 'Freestyle'),
        ('dance', 'Ice Dance'),
        ('pairs', 'Pairs'),
    ]

    LEVEL_CHOICES = [
        ('pre_alpha', 'Pre-Alpha'),
        ('alpha', 'Alpha'),
        ('beta', 'Beta'),
        ('gamma', 'Gamma'),
        ('delta', 'Delta'),
        ('pre_juvenile', 'Pre-Juvenile'),
        ('juvenile', 'Juvenile'),
        ('intermediate', 'Intermediate'),
        ('novice', 'Novice'),
        ('junior', 'Junior'),
        ('senior', 'Senior'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    skater = models.ForeignKey(Skater, on_delete=models.CASCADE, related_name='levels')
    discipline = models.CharField(max_length=20, choices=DISCIPLINE_CHOICES)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES)
    passed_date = models.DateField(null=True, blank=True)
    judge_name = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recorded_levels',
    )

    class Meta:
        ordering = ['discipline', 'level']
        unique_together = [['skater', 'discipline']]
        indexes = [models.Index(fields=['club', 'skater'])]

    def __str__(self):
        return f"{self.skater.full_name} — {self.discipline}: {self.level}"


class ConsentRecord(models.Model):
    """
    Auditable COPPA consent. Append-only — never update, only add new rows.
    Required before collecting data from any minor skater.
    """

    CONSENT_REGISTRATION = "registration"
    CONSENT_COMPETITION_DATA = "competition_data"
    CONSENT_COACH_NOTES = "coach_notes"
    CONSENT_PHOTO = "photo"
    CONSENT_CHOICES = [
        (CONSENT_REGISTRATION, "Member Registration"),
        (CONSENT_COMPETITION_DATA, "Competition History Display"),
        (CONSENT_COACH_NOTES, "Coach Notes & Evaluations"),
        (CONSENT_PHOTO, "Photos and Media"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    skater = models.ForeignKey(Skater, on_delete=models.PROTECT, related_name="consent_records")
    guardian = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="granted_consents"
    )
    consent_type = models.CharField(max_length=30, choices=CONSENT_CHOICES)
    granted_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    consent_text = models.TextField(help_text="Exact consent text shown to user at time of consent")
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-granted_at"]
        indexes = [
            models.Index(fields=["skater", "consent_type"]),
        ]

    def __str__(self):
        return f"{self.consent_type} consent for {self.skater} by {self.guardian}"

    @property
    def is_active(self):
        return self.revoked_at is None

    def revoke(self):
        self.revoked_at = timezone.now()
        self.save(update_fields=["revoked_at"])

    @classmethod
    def has_active_consent(cls, skater, consent_type):
        return cls.objects.filter(
            skater=skater,
            consent_type=consent_type,
            revoked_at__isnull=True,
        ).exists()
