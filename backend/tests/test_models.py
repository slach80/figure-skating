import pytest
from datetime import date, timedelta, time
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.members.models import Skater, ConsentRecord, MembershipType
from apps.scheduling.models import LessonBooking, InstructorSlot, LessonType


@pytest.mark.django_db
class TestSkaterModel:

    def test_is_minor_true(self, skater):
        assert skater.is_minor is True

    def test_is_minor_false(self, adult_skater):
        assert adult_skater.is_minor is False

    def test_is_active_member_true(self, skater):
        assert skater.is_active_member is True

    def test_is_active_member_false_expired(self, club, parent_user, membership_type):
        expired_skater = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Jake",
            last_name="Expired",
            date_of_birth=date(2015, 6, 15),
            address_line1="789 Elm St",
            city="Kansas City",
            state="MO",
            zip_code="64113",
            membership_type=membership_type,
            membership_status="active",
            membership_expiry=date.today() - timedelta(days=1),
        )
        assert expired_skater.is_active_member is False

    def test_is_active_member_false_status(self, club, parent_user, membership_type):
        inactive_skater = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Chris",
            last_name="Inactive",
            date_of_birth=date(2015, 6, 15),
            address_line1="789 Elm St",
            city="Kansas City",
            state="MO",
            zip_code="64113",
            membership_type=membership_type,
            membership_status="expired",
            membership_expiry=date.today() + timedelta(days=365),
        )
        assert inactive_skater.is_active_member is False

    def test_full_name(self, skater):
        assert skater.full_name == "Emma Anderson"

    def test_soft_delete(self, skater):
        skater_id = skater.id
        skater.soft_delete()

        assert skater.deleted_at is not None
        assert Skater.objects.filter(id=skater_id).exists() is False
        assert Skater.all_objects.filter(id=skater_id).exists() is True


@pytest.mark.django_db
class TestConsentRecord:

    def test_has_active_consent_true(self, skater):
        ConsentRecord.objects.create(
            skater=skater,
            guardian=skater.managed_by,
            consent_type=ConsentRecord.CONSENT_REGISTRATION,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            consent_text="I consent to registration",
        )
        assert ConsentRecord.has_active_consent(skater, ConsentRecord.CONSENT_REGISTRATION) is True

    def test_has_active_consent_false_revoked(self, skater):
        consent = ConsentRecord.objects.create(
            skater=skater,
            guardian=skater.managed_by,
            consent_type=ConsentRecord.CONSENT_REGISTRATION,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            consent_text="I consent to registration",
        )
        consent.revoke()
        assert ConsentRecord.has_active_consent(skater, ConsentRecord.CONSENT_REGISTRATION) is False

    def test_has_active_consent_false_missing(self, skater):
        assert ConsentRecord.has_active_consent(skater, ConsentRecord.CONSENT_REGISTRATION) is False


@pytest.mark.django_db
class TestLessonBooking:

    @pytest.fixture
    def lesson_type(self, club):
        return LessonType.objects.create(
            club=club,
            name="Private Lesson",
            lesson_format=LessonType.FORMAT_PRIVATE,
            duration_minutes=30,
            price="50.00",
            max_participants=1,
        )

    @pytest.fixture
    def instructor_slot(self, club, coach_user, lesson_type):
        future = date.today() + timedelta(days=2)
        return InstructorSlot.objects.create(
            club=club,
            instructor=coach_user,
            lesson_type=lesson_type,
            date=future,
            start_time=time(10, 0),
            end_time=time(10, 30),
            max_bookings=3,
            current_bookings=0,
        )

    @pytest.fixture
    def booking(self, club, skater, coach_user, lesson_type, instructor_slot):
        future = date.today() + timedelta(days=2)
        return LessonBooking.objects.create(
            club=club,
            skater=skater,
            instructor=coach_user,
            availability_slot=instructor_slot,
            lesson_type=lesson_type,
            scheduled_date=future,
            scheduled_time=time(10, 0),
            status=LessonBooking.STATUS_PENDING,
        )

    def test_can_cancel_true(self, booking):
        assert booking.can_cancel is True

    def test_can_cancel_false_too_late(self, club, skater, coach_user, lesson_type):
        soon = timezone.now() + timedelta(hours=10)
        booking = LessonBooking.objects.create(
            club=club,
            skater=skater,
            instructor=coach_user,
            lesson_type=lesson_type,
            scheduled_date=soon.date(),
            scheduled_time=soon.time(),
            status=LessonBooking.STATUS_PENDING,
        )
        assert booking.can_cancel is False

    def test_can_cancel_false_cancelled(self, booking):
        booking.status = LessonBooking.STATUS_CANCELLED
        booking.save()
        assert booking.can_cancel is False

    def test_confirm_sets_status(self, booking):
        booking.confirm()
        assert booking.status == LessonBooking.STATUS_CONFIRMED
        assert booking.confirmed_at is not None

    def test_confirm_twice_raises(self, booking):
        booking.confirm()
        with pytest.raises(ValidationError):
            booking.confirm()

    def test_complete_requires_confirmed(self, booking):
        with pytest.raises(ValidationError):
            booking.complete()

    def test_mark_no_show(self, booking):
        booking.confirm()
        booking.mark_no_show()
        assert booking.status == LessonBooking.STATUS_NO_SHOW


@pytest.mark.django_db
class TestInstructorSlot:

    def test_spots_remaining(self, club, coach_user, lesson_type):
        tomorrow = date.today() + timedelta(days=1)
        slot = InstructorSlot.objects.create(
            club=club,
            instructor=coach_user,
            lesson_type=lesson_type,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(10, 30),
            max_bookings=3,
            current_bookings=1,
        )
        assert slot.spots_remaining == 2

    def test_update_status_fully_booked(self, club, coach_user, lesson_type):
        tomorrow = date.today() + timedelta(days=1)
        slot = InstructorSlot.objects.create(
            club=club,
            instructor=coach_user,
            lesson_type=lesson_type,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(10, 30),
            max_bookings=3,
            current_bookings=3,
        )
        slot.update_status()
        assert slot.status == InstructorSlot.STATUS_FULLY_BOOKED

    def test_check_conflicts_detects_overlap(self, club, coach_user, lesson_type):
        tomorrow = date.today() + timedelta(days=1)
        slot1 = InstructorSlot.objects.create(
            club=club,
            instructor=coach_user,
            lesson_type=lesson_type,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(10, 30),
            max_bookings=1,
        )
        slot2 = InstructorSlot(
            club=club,
            instructor=coach_user,
            lesson_type=lesson_type,
            date=tomorrow,
            start_time=time(10, 15),
            end_time=time(10, 45),
            max_bookings=1,
        )
        assert slot2.check_conflicts(exclude_self=False) is True

    def test_check_conflicts_no_overlap(self, club, coach_user, lesson_type):
        tomorrow = date.today() + timedelta(days=1)
        slot1 = InstructorSlot.objects.create(
            club=club,
            instructor=coach_user,
            lesson_type=lesson_type,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(10, 30),
            max_bookings=1,
        )
        slot2 = InstructorSlot(
            club=club,
            instructor=coach_user,
            lesson_type=lesson_type,
            date=tomorrow,
            start_time=time(11, 0),
            end_time=time(11, 30),
            max_bookings=1,
        )
        assert slot2.check_conflicts(exclude_self=False) is False
