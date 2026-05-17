"""Unit tests for apps/scheduling models."""
import pytest
from datetime import date, time, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def coach(db, club, admin_user):
    from apps.scheduling.models import Coach
    return Coach.objects.create(club=club, user=admin_user, is_active=True)


@pytest.fixture
def lesson_type_drop_in(db, club):
    """LessonType with an explicit drop_in_price."""
    from apps.scheduling.models import LessonType
    return LessonType.objects.create(
        club=club,
        name="Drop-In Private",
        lesson_format=LessonType.FORMAT_PRIVATE,
        duration_minutes=30,
        price="45.00",
        drop_in_price="10.00",
        max_participants=1,
    )


@pytest.fixture
def slot(db, club, coach, lesson_type):
    """A basic AvailabilitySlot two days in the future."""
    from apps.scheduling.models import AvailabilitySlot
    future = date.today() + timedelta(days=2)
    return AvailabilitySlot.objects.create(
        club=club,
        coach=coach,
        lesson_type=lesson_type,
        date=future,
        start_time=time(10, 0),
        end_time=time(10, 30),
        max_bookings=3,
        current_bookings=0,
    )


@pytest.fixture
def booking(db, club, skater, coach, lesson_type, slot):
    """A pending Booking 48+ hours in the future."""
    from apps.scheduling.models import Booking
    future = date.today() + timedelta(days=2)
    return Booking.objects.create(
        club=club,
        skater=skater,
        coach=coach,
        availability_slot=slot,
        lesson_type=lesson_type,
        scheduled_date=future,
        scheduled_time=time(10, 0),
        status=Booking.STATUS_PENDING,
    )


@pytest.fixture
def lesson_package(db, club, lesson_type_drop_in):
    """LessonPackage: 10 lessons for $80. Drop-in is $10 each."""
    from apps.scheduling.models import LessonPackage
    return LessonPackage.objects.create(
        club=club,
        name="10-Pack Private",
        lesson_type=lesson_type_drop_in,
        lesson_count=10,
        price="80.00",
    )


@pytest.fixture
def purchased_package(db, club, skater, lesson_package):
    """A paid PurchasedPackage with 10 total lessons."""
    from apps.scheduling.models import PurchasedPackage
    return PurchasedPackage.objects.create(
        club=club,
        skater=skater,
        package=lesson_package,
        lessons_total=10,
        lessons_used=0,
        amount_paid="80.00",
        payment_status="paid",
    )


# ---------------------------------------------------------------------------
# AvailabilitySlot tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAvailabilitySlotSpotsRemaining:
    def test_zero_bookings(self, slot):
        slot.current_bookings = 0
        assert slot.spots_remaining == 3

    def test_mid_bookings(self, slot):
        slot.current_bookings = 1
        assert slot.spots_remaining == 2

    def test_fully_booked(self, slot):
        slot.current_bookings = 3
        assert slot.spots_remaining == 0

    def test_never_negative(self, slot):
        slot.current_bookings = 99  # beyond max
        assert slot.spots_remaining == 0


@pytest.mark.django_db
class TestAvailabilitySlotIsAvailable:
    def test_available_status(self, slot):
        from apps.scheduling.models import AvailabilitySlot
        slot.status = AvailabilitySlot.STATUS_AVAILABLE
        slot.current_bookings = 0
        assert slot.is_available is True

    def test_partially_booked_still_available(self, slot):
        from apps.scheduling.models import AvailabilitySlot
        slot.status = AvailabilitySlot.STATUS_PARTIALLY_BOOKED
        slot.current_bookings = 1
        assert slot.is_available is True

    def test_fully_booked_not_available(self, slot):
        from apps.scheduling.models import AvailabilitySlot
        slot.status = AvailabilitySlot.STATUS_FULLY_BOOKED
        slot.current_bookings = 3
        assert slot.is_available is False

    def test_cancelled_not_available(self, slot):
        from apps.scheduling.models import AvailabilitySlot
        slot.status = AvailabilitySlot.STATUS_CANCELLED
        assert slot.is_available is False

    def test_available_status_but_full_bookings_not_available(self, slot):
        """available status but current_bookings >= max means spots_remaining=0."""
        from apps.scheduling.models import AvailabilitySlot
        slot.status = AvailabilitySlot.STATUS_AVAILABLE
        slot.current_bookings = slot.max_bookings  # 3
        assert slot.is_available is False


@pytest.mark.django_db
class TestAvailabilitySlotEffectivePrice:
    def test_no_override_uses_lesson_type_price(self, slot):
        # slot.lesson_type.price = 50.00, no override.
        # price may be a string or Decimal depending on whether the relation
        # was fetched from DB; compare via Decimal to be safe.
        slot.price_override = None
        assert Decimal(str(slot.effective_price)) == Decimal("50.00")

    def test_with_override(self, slot):
        slot.price_override = Decimal("35.00")
        assert Decimal(str(slot.effective_price)) == Decimal("35.00")


@pytest.mark.django_db
class TestAvailabilitySlotCheckConflicts:
    def test_overlapping_times_conflict(self, db, club, coach, lesson_type):
        from apps.scheduling.models import AvailabilitySlot
        tomorrow = date.today() + timedelta(days=1)
        # First slot: 10:00–10:30
        AvailabilitySlot.objects.create(
            club=club, coach=coach, lesson_type=lesson_type,
            date=tomorrow, start_time=time(10, 0), end_time=time(10, 30),
            max_bookings=1,
        )
        # Overlapping slot: 10:15–10:45
        overlap = AvailabilitySlot(
            club=club, coach=coach, lesson_type=lesson_type,
            date=tomorrow, start_time=time(10, 15), end_time=time(10, 45),
            max_bookings=1,
        )
        assert overlap.check_conflicts(exclude_self=False) is True

    def test_adjacent_times_no_conflict(self, db, club, coach, lesson_type):
        from apps.scheduling.models import AvailabilitySlot
        tomorrow = date.today() + timedelta(days=1)
        # First slot: 10:00–10:30
        AvailabilitySlot.objects.create(
            club=club, coach=coach, lesson_type=lesson_type,
            date=tomorrow, start_time=time(10, 0), end_time=time(10, 30),
            max_bookings=1,
        )
        # Immediately after: 10:30–11:00 — no overlap
        after = AvailabilitySlot(
            club=club, coach=coach, lesson_type=lesson_type,
            date=tomorrow, start_time=time(10, 30), end_time=time(11, 0),
            max_bookings=1,
        )
        assert after.check_conflicts(exclude_self=False) is False

    def test_non_overlapping_different_time(self, db, club, coach, lesson_type):
        from apps.scheduling.models import AvailabilitySlot
        tomorrow = date.today() + timedelta(days=1)
        AvailabilitySlot.objects.create(
            club=club, coach=coach, lesson_type=lesson_type,
            date=tomorrow, start_time=time(10, 0), end_time=time(10, 30),
            max_bookings=1,
        )
        later = AvailabilitySlot(
            club=club, coach=coach, lesson_type=lesson_type,
            date=tomorrow, start_time=time(11, 0), end_time=time(11, 30),
            max_bookings=1,
        )
        assert later.check_conflicts(exclude_self=False) is False

    def test_different_coach_no_conflict(self, db, club, admin_user, lesson_type):
        """Two coaches can have overlapping slots without conflicting with each other."""
        from apps.scheduling.models import AvailabilitySlot, Coach
        from apps.accounts.models import User

        # First coach wraps admin_user
        coach_a = Coach.objects.create(club=club, user=admin_user, is_active=True)

        other_user = User.objects.create_user(
            email="coach2@test.com", password="pass",
            club=club, role="coach",
        )
        coach_b = Coach.objects.create(club=club, user=other_user, is_active=True)

        tomorrow = date.today() + timedelta(days=1)
        AvailabilitySlot.objects.create(
            club=club, coach=coach_a, lesson_type=lesson_type,
            date=tomorrow, start_time=time(10, 0), end_time=time(10, 30),
            max_bookings=1,
        )
        other_slot = AvailabilitySlot(
            club=club, coach=coach_b, lesson_type=lesson_type,
            date=tomorrow, start_time=time(10, 0), end_time=time(10, 30),
            max_bookings=1,
        )
        assert other_slot.check_conflicts(exclude_self=False) is False


# ---------------------------------------------------------------------------
# Booking tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestBookingCanCancel:
    def test_confirmed_more_than_24h_away_can_cancel(self, booking):
        booking.status = booking.STATUS_CONFIRMED
        assert booking.can_cancel is True

    def test_pending_more_than_24h_away_can_cancel(self, booking):
        # Fixture has status=pending
        assert booking.can_cancel is True

    def test_within_24h_cannot_cancel(self, db, club, skater, coach, lesson_type):
        from apps.scheduling.models import Booking
        soon = timezone.now() + timedelta(hours=10)
        b = Booking.objects.create(
            club=club, skater=skater, coach=coach, lesson_type=lesson_type,
            scheduled_date=soon.date(),
            scheduled_time=soon.time().replace(second=0, microsecond=0),
            status=Booking.STATUS_CONFIRMED,
        )
        assert b.can_cancel is False

    def test_exactly_24h_away_can_cancel(self, db, club, skater, coach, lesson_type):
        from apps.scheduling.models import Booking
        exactly_24h = timezone.now() + timedelta(hours=24, minutes=1)
        b = Booking.objects.create(
            club=club, skater=skater, coach=coach, lesson_type=lesson_type,
            scheduled_date=exactly_24h.date(),
            scheduled_time=exactly_24h.time().replace(second=0, microsecond=0),
            status=Booking.STATUS_CONFIRMED,
        )
        assert b.can_cancel is True

    def test_already_cancelled_cannot_cancel(self, booking):
        booking.status = booking.STATUS_CANCELLED
        booking.save(update_fields=["status"])
        assert booking.can_cancel is False

    def test_completed_cannot_cancel(self, booking):
        booking.status = booking.STATUS_COMPLETED
        booking.save(update_fields=["status"])
        assert booking.can_cancel is False

    def test_no_show_cannot_cancel(self, booking):
        booking.status = booking.STATUS_NO_SHOW
        booking.save(update_fields=["status"])
        assert booking.can_cancel is False


@pytest.mark.django_db
class TestBookingCanReschedule:
    def test_confirmed_more_than_24h_can_reschedule(self, booking):
        booking.status = booking.STATUS_CONFIRMED
        assert booking.can_reschedule is True

    def test_pending_more_than_24h_can_reschedule(self, booking):
        assert booking.can_reschedule is True

    def test_completed_cannot_reschedule(self, booking):
        booking.status = booking.STATUS_COMPLETED
        booking.save(update_fields=["status"])
        assert booking.can_reschedule is False

    def test_within_24h_cannot_reschedule(self, db, club, skater, coach, lesson_type):
        from apps.scheduling.models import Booking
        soon = timezone.now() + timedelta(hours=5)
        b = Booking.objects.create(
            club=club, skater=skater, coach=coach, lesson_type=lesson_type,
            scheduled_date=soon.date(),
            scheduled_time=soon.time().replace(second=0, microsecond=0),
            status=Booking.STATUS_PENDING,
        )
        assert b.can_reschedule is False


@pytest.mark.django_db
class TestBookingConfirm:
    def test_confirm_pending_to_confirmed(self, booking):
        booking.confirm()
        booking.refresh_from_db()
        assert booking.status == booking.STATUS_CONFIRMED

    def test_confirm_twice_raises_validation_error(self, booking):
        booking.confirm()
        with pytest.raises(ValidationError):
            booking.confirm()

    def test_confirm_increments_slot_bookings(self, booking, slot):
        from apps.scheduling.models import AvailabilitySlot
        initial = slot.current_bookings
        booking.confirm()
        # Reload from DB — confirm() updates the slot via its own FK instance
        refreshed = AvailabilitySlot.objects.get(pk=slot.pk)
        assert refreshed.current_bookings == initial + 1


@pytest.mark.django_db
class TestBookingCancel:
    def test_cancel_confirmed_far_future(self, booking):
        booking.confirm()
        booking.cancel(reason="test")
        booking.refresh_from_db()
        assert booking.status == booking.STATUS_CANCELLED
        assert booking.cancellation_reason == "test"
        assert booking.cancelled_at is not None

    def test_cancel_within_24h_raises(self, db, club, skater, coach, lesson_type):
        from apps.scheduling.models import Booking
        soon = timezone.now() + timedelta(hours=10)
        b = Booking.objects.create(
            club=club, skater=skater, coach=coach, lesson_type=lesson_type,
            scheduled_date=soon.date(),
            scheduled_time=soon.time().replace(second=0, microsecond=0),
            status=Booking.STATUS_CONFIRMED,
        )
        with pytest.raises(ValidationError):
            b.cancel()


# ---------------------------------------------------------------------------
# LessonPackage tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestLessonPackagePricePerLesson:
    def test_ten_lessons_for_100_dollars(self, db, club, lesson_type):
        from apps.scheduling.models import LessonPackage
        pkg = LessonPackage.objects.create(
            club=club, name="10-pack", lesson_type=lesson_type,
            lesson_count=10, price="100.00",
        )
        assert pkg.price_per_lesson == Decimal("10.00")

    def test_price_per_lesson_with_package_fixture(self, lesson_package):
        # $80 / 10 lessons = $8.00
        assert lesson_package.price_per_lesson == Decimal("8.00")


@pytest.mark.django_db
class TestLessonPackageSavingsVsIndividual:
    def test_savings_calculation(self, lesson_package):
        # drop_in=$10, 10 lessons = $100 individual; package=$80 → saves $20
        savings = lesson_package.savings_vs_individual
        assert savings == Decimal("20.00")

    def test_zero_savings_when_same_price(self, db, club, lesson_type):
        from apps.scheduling.models import LessonPackage
        # lesson_type.price=50, no drop_in_price; 2 lessons at $50 each = $100
        pkg = LessonPackage.objects.create(
            club=club, name="2-pack", lesson_type=lesson_type,
            lesson_count=2, price="100.00",
        )
        assert pkg.savings_vs_individual == Decimal("0.00")


# ---------------------------------------------------------------------------
# PurchasedPackage tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestPurchasedPackageLessonsRemaining:
    def test_full_remaining(self, purchased_package):
        # 10 total, 0 used
        assert purchased_package.lessons_remaining == 10

    def test_partial_remaining(self, purchased_package):
        purchased_package.lessons_used = 3
        assert purchased_package.lessons_remaining == 7

    def test_all_used(self, purchased_package):
        purchased_package.lessons_used = 10
        assert purchased_package.lessons_remaining == 0

    def test_never_negative(self, purchased_package):
        purchased_package.lessons_used = 15
        assert purchased_package.lessons_remaining == 0


@pytest.mark.django_db
class TestPurchasedPackageIsActive:
    def test_paid_with_remaining_lessons_is_active(self, purchased_package):
        assert purchased_package.is_active is True

    def test_pending_payment_not_active(self, purchased_package):
        purchased_package.payment_status = "pending"
        assert purchased_package.is_active is False

    def test_all_lessons_used_not_active(self, purchased_package):
        purchased_package.lessons_used = 10
        assert purchased_package.is_active is False

    def test_expired_not_active(self, purchased_package):
        purchased_package.expires_at = date.today() - timedelta(days=1)
        assert purchased_package.is_active is False

    def test_no_expiry_is_active(self, purchased_package):
        purchased_package.expires_at = None
        assert purchased_package.is_active is True

    def test_expiry_today_is_active(self, purchased_package):
        purchased_package.expires_at = date.today()
        assert purchased_package.is_active is True


@pytest.mark.django_db
class TestPurchasedPackageUseLesson:
    def test_use_lesson_decrements_used(self, purchased_package):
        initial_used = purchased_package.lessons_used
        purchased_package.use_lesson()
        purchased_package.refresh_from_db()
        assert purchased_package.lessons_used == initial_used + 1

    def test_use_lesson_raises_when_no_lessons_remain(self, purchased_package):
        purchased_package.lessons_used = 10
        purchased_package.save(update_fields=["lessons_used"])
        with pytest.raises(ValidationError):
            purchased_package.use_lesson()

    def test_use_lesson_raises_when_pending_payment(self, purchased_package):
        purchased_package.payment_status = "pending"
        purchased_package.save(update_fields=["payment_status"])
        with pytest.raises(ValidationError):
            purchased_package.use_lesson()
