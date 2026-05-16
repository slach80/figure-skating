import pytest


@pytest.fixture
def club(db):
    from apps.clubs.models import Club
    return Club.objects.create(
        name="Line Creek FSC",
        slug="linecreek",
        email="admin@linecreekfsc.com",
    )


@pytest.fixture
def admin_user(db, club):
    from apps.accounts.models import User
    return User.objects.create_user(
        email="admin@linecreekfsc.com",
        password="testpass123",
        club=club,
        role="admin",
        first_name="Admin",
        last_name="User",
    )


@pytest.fixture
def coach_user(db, club):
    from apps.accounts.models import User
    return User.objects.create_user(
        email="coach@linecreekfsc.com",
        password="testpass123",
        club=club,
        role="coach",
        first_name="Coach",
        last_name="Smith",
    )


@pytest.fixture
def parent_user(db, club):
    from apps.accounts.models import User
    return User.objects.create_user(
        email="parent@example.com",
        password="testpass123",
        club=club,
        role="member",
        first_name="Sarah",
        last_name="Anderson",
    )


@pytest.fixture
def membership_type(db, club):
    from apps.members.models import MembershipType
    return MembershipType.objects.create(
        club=club,
        name="Juvenile",
        usfs_category="Juvenile",
        price_in_club="85.00",
        price_out_of_club="110.00",
    )


@pytest.fixture
def lesson_type(db, club):
    from apps.scheduling.models import LessonType
    return LessonType.objects.create(
        club=club,
        name="Private Lesson",
        lesson_format=LessonType.FORMAT_PRIVATE,
        duration_minutes=30,
        price="50.00",
        max_participants=1,
    )


@pytest.fixture
def skater(db, club, parent_user, membership_type):
    from datetime import date
    from apps.members.models import Skater
    return Skater.objects.create(
        club=club,
        managed_by=parent_user,
        first_name="Emma",
        last_name="Anderson",
        date_of_birth=date(2015, 3, 15),
        address_line1="123 Main St",
        city="Kansas City",
        state="MO",
        zip_code="64111",
        membership_type=membership_type,
        membership_status="active",
        membership_expiry=date(2027, 8, 31),
    )


@pytest.fixture
def adult_skater(db, club, parent_user, membership_type):
    from datetime import date
    from apps.members.models import Skater
    return Skater.objects.create(
        club=club,
        managed_by=parent_user,
        first_name="Jane",
        last_name="Smith",
        date_of_birth=date(1990, 6, 20),
        address_line1="456 Oak Ave",
        city="Kansas City",
        state="MO",
        zip_code="64112",
        membership_type=membership_type,
        membership_status="active",
        membership_expiry=date(2027, 8, 31),
    )
