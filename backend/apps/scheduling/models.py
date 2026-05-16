import uuid
from datetime import timedelta, datetime
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.common.models import ClubScopedModel, SoftDeleteModel


class LessonType(ClubScopedModel):
    """Lesson service catalog: private, semi-private, group."""

    FORMAT_PRIVATE = "private"
    FORMAT_SEMI_PRIVATE = "semi_private"
    FORMAT_GROUP = "group"
    FORMAT_CHOICES = [
        (FORMAT_PRIVATE, "Private (1-on-1)"),
        (FORMAT_SEMI_PRIVATE, "Semi-Private (2-3 skaters)"),
        (FORMAT_GROUP, "Group Lesson"),
    ]

    SKILL_LEVEL_CHOICES = [
        ("pre_alpha", "Pre-Alpha"),
        ("alpha", "Alpha"),
        ("beta", "Beta"),
        ("gamma", "Gamma"),
        ("delta", "Delta"),
        ("freestyle", "Freestyle"),
        ("moves", "Moves in the Field"),
        ("dance", "Ice Dance"),
        ("all", "All Levels"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    lesson_format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default=FORMAT_PRIVATE)
    skill_level = models.CharField(
        max_length=20, choices=SKILL_LEVEL_CHOICES, blank=True,
        help_text="Target USFS skill level for this lesson type"
    )
    duration_minutes = models.IntegerField(default=30)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    drop_in_price = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Drop-in price when no package is used"
    )
    max_participants = models.IntegerField(default=1)
    color = models.CharField(max_length=7, default="#5B2C91", help_text="Hex color for calendar")
    is_active = models.BooleanField(default=True)
    requires_package = models.BooleanField(default=False)
    allow_package = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["club", "is_active", "lesson_format"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.duration_minutes}min)"

    def get_drop_in_price(self):
        return self.drop_in_price if self.drop_in_price is not None else self.price


class InstructorSlot(ClubScopedModel):
    """Instructor availability — one-time or recurring blocks."""

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
    instructor = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="instructor_slots",
        limit_choices_to={"role__in": ["coach", "admin", "super_admin"]},
    )
    lesson_type = models.ForeignKey(
        LessonType, on_delete=models.CASCADE, related_name="instructor_slots"
    )
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    rink_location = models.CharField(max_length=100, blank=True)
    recurrence = models.CharField(max_length=20, choices=RECURRENCE_CHOICES, default=RECURRENCE_NONE)
    recurrence_end_date = models.DateField(null=True, blank=True)
    parent_slot = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="recurring_instances",
    )
    max_bookings = models.IntegerField(default=1)
    current_bookings = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    price_override = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["date", "start_time"]
        indexes = [
            models.Index(fields=["club", "instructor", "date"]),
            models.Index(fields=["club", "date", "status"]),
        ]

    def __str__(self):
        return f"{self.instructor} — {self.date} {self.start_time}-{self.end_time}"

    @property
    def is_available(self):
        return self.status in (self.STATUS_AVAILABLE, self.STATUS_PARTIALLY_BOOKED) and self.spots_remaining > 0

    @property
    def spots_remaining(self):
        return max(0, self.max_bookings - self.current_bookings)

    @property
    def effective_price(self):
        return self.price_override if self.price_override else self.lesson_type.price

    @property
    def datetime_start(self):
        return datetime.combine(self.date, self.start_time)

    @property
    def datetime_end(self):
        return datetime.combine(self.date, self.end_time)

    def check_conflicts(self, exclude_self=True):
        """Check for overlapping slots for the same instructor."""
        conflicts = InstructorSlot.objects.filter(
            instructor=self.instructor,
            date=self.date,
            status__in=(self.STATUS_AVAILABLE, self.STATUS_PARTIALLY_BOOKED, self.STATUS_FULLY_BOOKED),
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
        self.save(update_fields=["status"])

    def generate_recurring_slots(self):
        """Return unsaved InstructorSlot instances for the recurring series."""
        if self.recurrence == self.RECURRENCE_NONE or not self.recurrence_end_date:
            return []
        delta = timedelta(days=7 if self.recurrence == self.RECURRENCE_WEEKLY else 14)
        slots = []
        current_date = self.date + delta
        while current_date <= self.recurrence_end_date:
            slots.append(InstructorSlot(
                club=self.club,
                instructor=self.instructor,
                lesson_type=self.lesson_type,
                date=current_date,
                start_time=self.start_time,
                end_time=self.end_time,
                rink_location=self.rink_location,
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
            raise ValidationError("This slot conflicts with an existing instructor slot.")


class LessonBooking(ClubScopedModel, SoftDeleteModel):
    """Skater lesson booking with full lifecycle management."""

    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_NO_SHOW = "no_show"
    STATUS_RESCHEDULED = "rescheduled"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending Confirmation"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_NO_SHOW, "No Show"),
        (STATUS_RESCHEDULED, "Rescheduled"),
    ]

    PAYMENT_PENDING = "pending"
    PAYMENT_PAID = "paid"
    PAYMENT_PACKAGE = "package"
    PAYMENT_REFUNDED = "refunded"
    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_PENDING, "Pending"),
        (PAYMENT_PAID, "Paid"),
        (PAYMENT_PACKAGE, "Package Used"),
        (PAYMENT_REFUNDED, "Refunded"),
    ]

    CANCEL_CLIENT = "client_request"
    CANCEL_PROVIDER = "provider_unavailable"
    CANCEL_WEATHER = "weather"
    CANCEL_ILLNESS = "illness"
    CANCEL_RESCHEDULED = "rescheduled"
    CANCEL_OTHER = "other"
    CANCELLATION_REASON_CHOICES = [
        (CANCEL_CLIENT, "Client Request"),
        (CANCEL_PROVIDER, "Instructor Unavailable"),
        (CANCEL_WEATHER, "Weather"),
        (CANCEL_ILLNESS, "Illness"),
        (CANCEL_RESCHEDULED, "Rescheduled"),
        (CANCEL_OTHER, "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    skater = models.ForeignKey(
        "members.Skater", on_delete=models.PROTECT, related_name="lesson_bookings"
    )
    instructor = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, related_name="lesson_bookings_as_instructor"
    )
    availability_slot = models.ForeignKey(
        InstructorSlot, on_delete=models.PROTECT, null=True, blank=True, related_name="bookings"
    )
    lesson_type = models.ForeignKey(
        LessonType, on_delete=models.PROTECT, related_name="bookings"
    )
    scheduled_date = models.DateField(db_index=True)
    scheduled_time = models.TimeField()
    duration_minutes = models.IntegerField(default=30)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, db_index=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_PENDING)
    amount_paid = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    cancellation_reason = models.CharField(max_length=30, choices=CANCELLATION_REASON_CHOICES, blank=True)
    cancellation_notes = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="cancelled_lesson_bookings"
    )
    rescheduled_from = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="rescheduled_to"
    )
    skater_notes = models.TextField(blank=True)
    lesson_notes = models.TextField(blank=True, help_text="Coach's post-lesson notes")
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-scheduled_date", "-scheduled_time"]
        indexes = [
            models.Index(fields=["club", "skater", "scheduled_date"]),
            models.Index(fields=["club", "instructor", "scheduled_date"]),
            models.Index(fields=["club", "status"]),
        ]

    def __str__(self):
        return f"{self.skater} — {self.lesson_type} on {self.scheduled_date}"

    @property
    def scheduled_datetime(self):
        return timezone.make_aware(datetime.combine(self.scheduled_date, self.scheduled_time))

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
        self.confirmed_at = timezone.now()
        self.save()
        if self.availability_slot:
            self.availability_slot.current_bookings += 1
            self.availability_slot.update_status()
        return True

    def cancel(self, reason, notes="", cancelled_by=None):
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

    def reschedule(self, new_slot, cancelled_by=None):
        if not self.can_reschedule:
            raise ValidationError("This booking cannot be rescheduled.")
        new_booking = LessonBooking.objects.create(
            club=self.club,
            skater=self.skater,
            instructor=new_slot.instructor,
            availability_slot=new_slot,
            lesson_type=self.lesson_type,
            scheduled_date=new_slot.date,
            scheduled_time=new_slot.start_time,
            duration_minutes=self.duration_minutes,
            status=self.STATUS_CONFIRMED,
            payment_status=self.payment_status,
            amount_paid=self.amount_paid,
            rescheduled_from=self,
            skater_notes=self.skater_notes,
        )
        self.cancel(
            reason=self.CANCEL_RESCHEDULED,
            notes=f"Rescheduled to {new_slot.date}",
            cancelled_by=cancelled_by,
        )
        return new_booking

    def complete(self):
        if self.status != self.STATUS_CONFIRMED:
            raise ValidationError("Only confirmed bookings can be completed.")
        self.status = self.STATUS_COMPLETED
        self.completed_at = timezone.now()
        self.save()
        return True

    def mark_no_show(self):
        if self.status != self.STATUS_CONFIRMED:
            raise ValidationError("Only confirmed bookings can be marked as no-show.")
        self.status = self.STATUS_NO_SHOW
        self.save()
        return True

    def clean(self):
        if not self.skater_id or not self.scheduled_date or not self.scheduled_time:
            return
        conflicts = LessonBooking.objects.filter(
            skater=self.skater,
            scheduled_date=self.scheduled_date,
            scheduled_time=self.scheduled_time,
            status__in=(self.STATUS_PENDING, self.STATUS_CONFIRMED),
        ).exclude(pk=self.pk)
        if conflicts.exists():
            raise ValidationError("This skater already has a lesson booked at this time.")
