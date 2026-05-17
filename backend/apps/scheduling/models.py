import uuid
from datetime import timedelta, datetime
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.common.models import ClubScopedModel



class Coach(ClubScopedModel):
    """Coach profile — wraps a User account with skating-specific info."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="coach_profile",
    )
    bio = models.TextField(blank=True)
    specialties = models.CharField(
        max_length=200,
        blank=True,
        help_text='e.g. "Freestyle, Dance"',
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["user__last_name", "user__first_name"]
        indexes = [
            models.Index(fields=["club", "is_active"]),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} (coach)"


class LessonType(ClubScopedModel):
    """Lesson service catalog: private, semi-private, group, test session, club ice."""

    FORMAT_PRIVATE = "private"
    FORMAT_SEMI_PRIVATE = "semi_private"
    FORMAT_GROUP = "group"
    FORMAT_TEST_SESSION = "test_session"
    FORMAT_CLUB_ICE = "club_ice"
    FORMAT_CHOICES = [
        (FORMAT_PRIVATE, "Private"),
        (FORMAT_SEMI_PRIVATE, "Semi-Private"),
        (FORMAT_GROUP, "Group"),
        (FORMAT_TEST_SESSION, "Test Session"),
        (FORMAT_CLUB_ICE, "Club Ice"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    lesson_format = models.CharField(
        max_length=20,
        choices=FORMAT_CHOICES,
        default=FORMAT_PRIVATE,
    )
    duration_minutes = models.IntegerField(default=30)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    drop_in_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Drop-in price when no package is used",
    )
    max_participants = models.IntegerField(default=1)
    color = models.CharField(max_length=7, default="#5B2C91", help_text="Hex color for calendar")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["club", "is_active", "lesson_format"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.duration_minutes}min)"

    def get_drop_in_price(self):
        return self.drop_in_price if self.drop_in_price is not None else self.price


class AvailabilitySlot(ClubScopedModel):
    """Coach availability — one-time or recurring blocks."""

    RECURRENCE_NONE = "none"
    RECURRENCE_WEEKLY = "weekly"
    RECURRENCE_BIWEEKLY = "biweekly"
    RECURRENCE_CHOICES = [
        (RECURRENCE_NONE, "One-time"),
        (RECURRENCE_WEEKLY, "Weekly"),
        (RECURRENCE_BIWEEKLY, "Bi-weekly"),
    ]

    STATUS_AVAILABLE = "available"
    STATUS_PARTIALLY_BOOKED = "partially_booked"
    STATUS_FULLY_BOOKED = "fully_booked"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_PARTIALLY_BOOKED, "Partially Booked"),
        (STATUS_FULLY_BOOKED, "Fully Booked"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name="slots",
    )
    lesson_type = models.ForeignKey(
        LessonType,
        on_delete=models.CASCADE,
        related_name="slots",
    )
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    recurrence = models.CharField(
        max_length=20,
        choices=RECURRENCE_CHOICES,
        default=RECURRENCE_NONE,
    )
    recurrence_end_date = models.DateField(null=True, blank=True)
    parent_slot = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="instances",
    )
    max_bookings = models.IntegerField(default=1)
    current_bookings = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_AVAILABLE,
    )
    price_override = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["date", "start_time"]
        indexes = [
            models.Index(fields=["club", "coach", "date"]),
            models.Index(fields=["club", "date", "status"]),
        ]

    def __str__(self):
        return f"{self.coach} — {self.date} {self.start_time}-{self.end_time}"

    @property
    def is_available(self):
        return (
            self.status in (self.STATUS_AVAILABLE, self.STATUS_PARTIALLY_BOOKED)
            and self.spots_remaining > 0
        )

    @property
    def spots_remaining(self):
        return max(0, self.max_bookings - self.current_bookings)

    @property
    def effective_price(self):
        return self.price_override if self.price_override else self.lesson_type.price

    def check_conflicts(self, exclude_self=True):
        """Check for overlapping slots for the same coach."""
        conflicts = AvailabilitySlot.objects.filter(
            coach=self.coach,
            date=self.date,
            status__in=(
                self.STATUS_AVAILABLE,
                self.STATUS_PARTIALLY_BOOKED,
                self.STATUS_FULLY_BOOKED,
            ),
        ).exclude(end_time__lte=self.start_time).exclude(start_time__gte=self.end_time)
        if exclude_self and self.pk:
            conflicts = conflicts.exclude(pk=self.pk)
        return conflicts.exists()

    def update_status(self):
        if self.current_bookings >= self.max_bookings:
            self.status = self.STATUS_FULLY_BOOKED
        elif self.current_bookings > 0:
            self.status = self.STATUS_PARTIALLY_BOOKED
        else:
            self.status = self.STATUS_AVAILABLE
        self.save(update_fields=["status", "current_bookings"])

    def generate_recurring_slots(self):
        """Return unsaved AvailabilitySlot instances for the recurring series."""
        if self.recurrence == self.RECURRENCE_NONE or not self.recurrence_end_date:
            return []
        delta = timedelta(days=7 if self.recurrence == self.RECURRENCE_WEEKLY else 14)
        slots = []
        current_date = self.date + delta
        while current_date <= self.recurrence_end_date:
            slots.append(AvailabilitySlot(
                club=self.club,
                coach=self.coach,
                lesson_type=self.lesson_type,
                date=current_date,
                start_time=self.start_time,
                end_time=self.end_time,
                recurrence=self.RECURRENCE_NONE,
                max_bookings=self.max_bookings,
                price_override=self.price_override,
                parent_slot=self,
            ))
            current_date += delta
        return slots

    def clean(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time.")
        if self.check_conflicts():
            raise ValidationError("This slot conflicts with an existing coach slot.")


class Booking(ClubScopedModel):
    """Skater lesson booking with full lifecycle management."""

    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_NO_SHOW = "no_show"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_NO_SHOW, "No Show"),
    ]

    PAYMENT_PENDING = "pending"
    PAYMENT_PAID = "paid"
    PAYMENT_REFUNDED = "refunded"
    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_PENDING, "Pending"),
        (PAYMENT_PAID, "Paid"),
        (PAYMENT_REFUNDED, "Refunded"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    skater = models.ForeignKey(
        "members.Skater",
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    availability_slot = models.ForeignKey(
        AvailabilitySlot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    lesson_type = models.ForeignKey(
        LessonType,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    scheduled_date = models.DateField(db_index=True)
    scheduled_time = models.TimeField()
    duration_minutes = models.IntegerField(default=30)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default=PAYMENT_PENDING,
    )
    amount_paid = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    cancellation_reason = models.CharField(max_length=200, blank=True)
    cancellation_notes = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_bookings",
    )
    rescheduled_from = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rescheduled_to",
    )
    client_notes = models.TextField(blank=True)
    coach_notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-scheduled_date", "-scheduled_time"]
        indexes = [
            models.Index(fields=["club", "skater", "scheduled_date"]),
            models.Index(fields=["club", "coach", "scheduled_date"]),
            models.Index(fields=["club", "status"]),
        ]

    def __str__(self):
        return f"{self.skater} — {self.lesson_type} on {self.scheduled_date}"

    @property
    def scheduled_datetime(self):
        return timezone.make_aware(
            datetime.combine(self.scheduled_date, self.scheduled_time)
        )

    @property
    def can_cancel(self):
        if self.status in (self.STATUS_CANCELLED, self.STATUS_COMPLETED, self.STATUS_NO_SHOW):
            return False
        hours_until = (self.scheduled_datetime - timezone.now()).total_seconds() / 3600
        return hours_until >= 24

    @property
    def can_reschedule(self):
        return self.can_cancel and self.status in (self.STATUS_PENDING, self.STATUS_CONFIRMED)

    def confirm(self):
        if self.status != self.STATUS_PENDING:
            raise ValidationError("Only pending bookings can be confirmed.")
        self.status = self.STATUS_CONFIRMED
        self.save(update_fields=["status", "updated_at"])
        if self.availability_slot:
            self.availability_slot.current_bookings += 1
            self.availability_slot.update_status()
        return True

    def cancel(self, reason="", notes="", cancelled_by=None):
        if not self.can_cancel:
            raise ValidationError("This booking cannot be cancelled.")
        self.status = self.STATUS_CANCELLED
        self.cancellation_reason = reason
        self.cancellation_notes = notes
        self.cancelled_at = timezone.now()
        self.cancelled_by = cancelled_by
        self.save()
        if self.availability_slot and self.availability_slot.current_bookings > 0:
            self.availability_slot.current_bookings -= 1
            self.availability_slot.update_status()
        return True

    def complete(self):
        if self.status != self.STATUS_CONFIRMED:
            raise ValidationError("Only confirmed bookings can be completed.")
        self.status = self.STATUS_COMPLETED
        self.save(update_fields=["status", "updated_at"])
        return True


class CoachEvaluation(ClubScopedModel):
    """Coach's formal written evaluation of a skater's progress."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    skater = models.ForeignKey(
        'members.Skater',
        on_delete=models.CASCADE,
        related_name='evaluations',
    )
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name='evaluations',
    )
    evaluation_date = models.DateField()

    # Scored areas (1-5 scale)
    skating_skills = models.IntegerField(null=True, blank=True)   # edges, turns, steps
    transitions = models.IntegerField(null=True, blank=True)
    performance = models.IntegerField(null=True, blank=True)
    choreography = models.IntegerField(null=True, blank=True)
    interpretation = models.IntegerField(null=True, blank=True)

    strengths = models.TextField(blank=True)
    areas_to_improve = models.TextField(blank=True)
    goals_next_period = models.TextField(blank=True)
    overall_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-evaluation_date']
        indexes = [models.Index(fields=['club', 'skater', 'evaluation_date'])]

    def __str__(self):
        return f"Eval: {self.skater.full_name} by {self.coach} on {self.evaluation_date}"

    @property
    def average_score(self):
        scores = [
            s for s in [
                self.skating_skills, self.transitions, self.performance,
                self.choreography, self.interpretation,
            ]
            if s is not None
        ]
        return sum(scores) / len(scores) if scores else None


class LessonPackage(ClubScopedModel):
    """Pre-purchased bundle of lessons (e.g. 5-pack private lessons)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)  # "5-Pack Private Lessons"
    lesson_type = models.ForeignKey(LessonType, on_delete=models.CASCADE, related_name='packages')
    lesson_count = models.IntegerField()  # 5, 10, etc.
    price = models.DecimalField(max_digits=8, decimal_places=2)  # bundle price
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['lesson_type', 'lesson_count']
        indexes = [models.Index(fields=['club', 'lesson_type', 'is_active'])]

    def __str__(self):
        return f"{self.name} ({self.lesson_count} lessons)"

    @property
    def price_per_lesson(self):
        from decimal import Decimal
        price = Decimal(str(self.price))
        return price / self.lesson_count if self.lesson_count > 0 else price

    @property
    def savings_vs_individual(self):
        """How much cheaper vs buying drop-in lessons individually."""
        from decimal import Decimal
        drop_in = Decimal(str(self.lesson_type.get_drop_in_price()))
        price = Decimal(str(self.price))
        return (drop_in * self.lesson_count) - price


class PurchasedPackage(ClubScopedModel):
    """A skater's purchased lesson package with remaining credits."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    skater = models.ForeignKey('members.Skater', on_delete=models.CASCADE, related_name='lesson_packages')
    package = models.ForeignKey(LessonPackage, on_delete=models.PROTECT, related_name='purchases')
    lessons_total = models.IntegerField()   # copy from package.lesson_count at purchase time
    lessons_used = models.IntegerField(default=0)
    amount_paid = models.DecimalField(max_digits=8, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('paid', 'Paid'), ('refunded', 'Refunded')],
        default='pending',
    )
    purchased_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateField(null=True, blank=True)  # optional expiry

    class Meta:
        ordering = ['-purchased_at']
        indexes = [models.Index(fields=['club', 'skater', 'payment_status'])]

    def __str__(self):
        return f"{self.skater.full_name} — {self.package.name} ({self.lessons_remaining} left)"

    @property
    def lessons_remaining(self):
        return max(0, self.lessons_total - self.lessons_used)

    @property
    def is_active(self):
        if self.payment_status != 'paid':
            return False
        if self.lessons_remaining <= 0:
            return False
        if self.expires_at and timezone.now().date() > self.expires_at:
            return False
        return True

    def use_lesson(self):
        """Decrement lessons_used when a booking is made using this package."""
        if not self.is_active:
            raise ValidationError("This package has no remaining lessons.")
        self.lessons_used += 1
        self.save(update_fields=['lessons_used', 'updated_at'])


class TestSession(ClubScopedModel):
    """A scheduled USFS test session that skaters can register for."""

    TEST_TYPE_CHOICES = [
        ('moves', 'Moves in the Field'),
        ('freestyle', 'Freestyle'),
        ('dance', 'Ice Dance'),
        ('pattern_dance', 'Pattern Dance'),
        ('pairs', 'Pairs'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)  # e.g. "Spring 2026 Test Session"
    date = models.DateField(db_index=True)
    location = models.CharField(max_length=200, blank=True)
    judge_name = models.CharField(max_length=200, blank=True)
    test_types = models.JSONField(default=list)  # list of test_type values
    fee_per_test = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    registration_deadline = models.DateField(null=True, blank=True)
    max_registrations = models.IntegerField(default=50)
    is_open = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date']
        indexes = [models.Index(fields=['club', 'date', 'is_open'])]

    def __str__(self):
        return f"{self.name} — {self.date}"

    @property
    def spots_remaining(self):
        return max(0, self.max_registrations - self.registrations.count())

    @property
    def is_registration_open(self):
        if not self.is_open:
            return False
        if self.registration_deadline and timezone.now().date() > self.registration_deadline:
            return False
        return True


class TestRegistration(ClubScopedModel):
    """A skater's registration for a specific test session."""

    RESULT_CHOICES = [
        ('registered', 'Registered'),
        ('pass', 'Pass'),
        ('retry', 'Retry'),
        ('scratch', 'Scratched'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test_session = models.ForeignKey(TestSession, on_delete=models.CASCADE, related_name='registrations')
    skater = models.ForeignKey('members.Skater', on_delete=models.CASCADE, related_name='test_registrations')
    test_types = models.JSONField(default=list)  # which tests the skater is taking
    test_levels = models.JSONField(default=dict)  # {'moves': 'Pre-Juvenile', 'freestyle': 'Juvenile'}
    amount_paid = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    payment_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('paid', 'Paid'), ('refunded', 'Refunded')],
        default='pending',
    )
    result = models.CharField(max_length=20, choices=RESULT_CHOICES, default='registered')
    result_notes = models.TextField(blank=True)
    scratched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['skater__last_name', 'skater__first_name']
        unique_together = [['test_session', 'skater']]
        indexes = [models.Index(fields=['club', 'test_session'])]

    def __str__(self):
        return f"{self.skater.full_name} @ {self.test_session.name}"

    @property
    def fee(self):
        return self.test_session.fee_per_test * len(self.test_types)
