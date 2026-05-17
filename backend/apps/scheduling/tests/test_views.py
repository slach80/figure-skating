"""View tests for apps/scheduling."""
import pytest
from datetime import date, time, timedelta

from django.utils import timezone
from rest_framework.test import APIClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_authed_client(user, club):
    """Return an APIClient authenticated as `user`, with club on each request."""
    client = APIClient()
    client.force_authenticate(user=user)
    # Attach club to the request via a WSGI environ hack used by the middleware
    # The ClubScopedViewMixin falls back to request.user.club if request.club is None,
    # so as long as the user has a club FK set this works.
    return client


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def coach(db, club, admin_user):
    from apps.scheduling.models import Coach
    return Coach.objects.create(club=club, user=admin_user, is_active=True)


@pytest.fixture
def coach_member_user(db, club):
    """A user with role=coach (not admin)."""
    from apps.accounts.models import User
    return User.objects.create_user(
        email="coachonly@test.com",
        password="pass123",
        club=club,
        role="coach",
        first_name="Coach",
        last_name="Only",
    )


@pytest.fixture
def coach_for_member(db, club, coach_member_user):
    from apps.scheduling.models import Coach
    return Coach.objects.create(club=club, user=coach_member_user, is_active=True)


@pytest.fixture
def slot(db, club, coach, lesson_type):
    future = date.today() + timedelta(days=3)
    from apps.scheduling.models import AvailabilitySlot
    return AvailabilitySlot.objects.create(
        club=club, coach=coach, lesson_type=lesson_type,
        date=future, start_time=time(10, 0), end_time=time(10, 30),
        max_bookings=3, current_bookings=0,
    )


@pytest.fixture
def booking_pending(db, club, skater, coach, lesson_type, slot):
    from apps.scheduling.models import Booking
    future = date.today() + timedelta(days=3)
    return Booking.objects.create(
        club=club, skater=skater, coach=coach,
        availability_slot=slot, lesson_type=lesson_type,
        scheduled_date=future,
        scheduled_time=time(10, 0),
        status=Booking.STATUS_PENDING,
    )


@pytest.fixture
def booking_confirmed_far(db, club, skater, coach, lesson_type, slot):
    from apps.scheduling.models import Booking
    future = date.today() + timedelta(days=3)
    b = Booking.objects.create(
        club=club, skater=skater, coach=coach,
        availability_slot=slot, lesson_type=lesson_type,
        scheduled_date=future,
        scheduled_time=time(10, 0),
        status=Booking.STATUS_CONFIRMED,
    )
    return b


@pytest.fixture
def booking_confirmed_soon(db, club, skater, coach, lesson_type):
    """Booking confirmed, only 5h away (cannot cancel)."""
    from apps.scheduling.models import Booking
    soon = timezone.now() + timedelta(hours=5)
    return Booking.objects.create(
        club=club, skater=skater, coach=coach,
        lesson_type=lesson_type,
        scheduled_date=soon.date(),
        scheduled_time=soon.time().replace(second=0, microsecond=0),
        status=Booking.STATUS_CONFIRMED,
    )


@pytest.fixture
def other_club(db):
    from apps.clubs.models import Club
    return Club.objects.create(
        name="Other Club FSC",
        slug="other-club",
        email="admin@otherclub.com",
    )


@pytest.fixture
def other_club_admin(db, other_club):
    from apps.accounts.models import User
    return User.objects.create_user(
        email="admin@otherclub.com",
        password="pass123",
        club=other_club,
        role="admin",
    )


@pytest.fixture
def other_slot(db, other_club, other_club_admin, lesson_type, club):
    """Slot belonging to other_club, using a lesson_type from that club."""
    from apps.scheduling.models import Coach, LessonType, AvailabilitySlot
    lt = LessonType.objects.create(
        club=other_club,
        name="Other Private",
        lesson_format=LessonType.FORMAT_PRIVATE,
        duration_minutes=30,
        price="50.00",
        max_participants=1,
    )
    c = Coach.objects.create(club=other_club, user=other_club_admin, is_active=True)
    future = date.today() + timedelta(days=3)
    return AvailabilitySlot.objects.create(
        club=other_club, coach=c, lesson_type=lt,
        date=future, start_time=time(14, 0), end_time=time(14, 30),
        max_bookings=1,
    )


# ---------------------------------------------------------------------------
# AvailabilitySlotViewSet — multi-tenant isolation
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAvailabilitySlotListIsolation:
    def test_admin_sees_own_club_slot(self, admin_user, club, slot, other_slot):
        client = make_authed_client(admin_user, club)
        resp = client.get("/api/v1/scheduling/slots/")
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.json()["results"] if "id" in item]
        # Fallback for non-paginated
        data = resp.json()
        if isinstance(data, dict) and "results" in data:
            ids = [item["id"] for item in data["results"]]
        else:
            ids = [item["id"] for item in data]
        assert str(slot.id) in ids
        assert str(other_slot.id) not in ids

    def test_other_club_admin_does_not_see_first_club_slot(self, other_club_admin, other_club, slot, other_slot):
        client = make_authed_client(other_club_admin, other_club)
        resp = client.get("/api/v1/scheduling/slots/")
        assert resp.status_code == 200
        data = resp.json()
        if isinstance(data, dict) and "results" in data:
            ids = [item["id"] for item in data["results"]]
        else:
            ids = [item["id"] for item in data]
        assert str(slot.id) not in ids
        assert str(other_slot.id) in ids


# ---------------------------------------------------------------------------
# BookingViewSet — confirm action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestBookingConfirmAction:
    def test_confirm_pending_booking_returns_200(self, admin_user, club, booking_pending):
        client = make_authed_client(admin_user, club)
        url = f"/api/v1/scheduling/bookings/{booking_pending.id}/confirm/"
        resp = client.post(url)
        assert resp.status_code == 200
        assert resp.json()["status"] == "confirmed"

    def test_confirm_already_confirmed_returns_400(self, admin_user, club, booking_pending):
        client = make_authed_client(admin_user, club)
        url = f"/api/v1/scheduling/bookings/{booking_pending.id}/confirm/"
        resp1 = client.post(url)
        assert resp1.status_code == 200
        resp2 = client.post(url)
        assert resp2.status_code == 400


# ---------------------------------------------------------------------------
# BookingViewSet — cancel action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestBookingCancelAction:
    def test_cancel_confirmed_far_future_returns_200(self, admin_user, club, booking_confirmed_far):
        client = make_authed_client(admin_user, club)
        url = f"/api/v1/scheduling/bookings/{booking_confirmed_far.id}/cancel/"
        resp = client.post(url, {"reason": "changed mind"}, format="json")
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    def test_cancel_within_24h_returns_400(self, admin_user, club, booking_confirmed_soon):
        client = make_authed_client(admin_user, club)
        url = f"/api/v1/scheduling/bookings/{booking_confirmed_soon.id}/cancel/"
        resp = client.post(url, {}, format="json")
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# BookingViewSet — today action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestBookingTodayAction:
    def test_today_returns_only_todays_bookings(self, db, admin_user, club, skater, coach, lesson_type):
        from apps.scheduling.models import Booking
        today = date.today()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)

        b_today = Booking.objects.create(
            club=club, skater=skater, coach=coach, lesson_type=lesson_type,
            scheduled_date=today, scheduled_time=time(9, 0),
            status=Booking.STATUS_CONFIRMED,
        )
        Booking.objects.create(
            club=club, skater=skater, coach=coach, lesson_type=lesson_type,
            scheduled_date=yesterday, scheduled_time=time(9, 0),
            status=Booking.STATUS_CONFIRMED,
        )
        Booking.objects.create(
            club=club, skater=skater, coach=coach, lesson_type=lesson_type,
            scheduled_date=tomorrow, scheduled_time=time(9, 0),
            status=Booking.STATUS_CONFIRMED,
        )

        client = make_authed_client(admin_user, club)
        resp = client.get("/api/v1/scheduling/bookings/today/")
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.json()]
        assert str(b_today.id) in ids
        assert len(ids) == 1

    def test_coach_role_sees_only_own_bookings_in_today(
        self, db, club, skater, coach, coach_for_member, coach_member_user, lesson_type
    ):
        from apps.scheduling.models import Booking
        today = date.today()
        # Booking for coach (admin_user)
        b1 = Booking.objects.create(
            club=club, skater=skater, coach=coach, lesson_type=lesson_type,
            scheduled_date=today, scheduled_time=time(9, 0),
            status=Booking.STATUS_CONFIRMED,
        )
        # Booking for coach_for_member
        b2 = Booking.objects.create(
            club=club, skater=skater, coach=coach_for_member, lesson_type=lesson_type,
            scheduled_date=today, scheduled_time=time(10, 0),
            status=Booking.STATUS_CONFIRMED,
        )

        client = make_authed_client(coach_member_user, club)
        resp = client.get("/api/v1/scheduling/bookings/today/")
        assert resp.status_code == 200
        ids = [item["id"] for item in resp.json()]
        # Coach-only user should see only their own booking
        assert str(b2.id) in ids
        assert str(b1.id) not in ids
