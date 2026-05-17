"""Unit tests for apps/members models."""
import pytest
from datetime import date, timedelta
from django.utils import timezone


@pytest.mark.django_db
class TestMembershipType:
    def test_str(self, membership_type, club):
        assert str(membership_type) == f"Juvenile ({club})"

    def test_str_includes_club_name(self, membership_type):
        assert "Line Creek FSC" in str(membership_type)


@pytest.mark.django_db
class TestSkaterFullName:
    def test_full_name(self, skater):
        assert skater.full_name == "Emma Anderson"

    def test_full_name_concatenation(self, db, club, parent_user, membership_type):
        from apps.members.models import Skater
        s = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Alice",
            last_name="Wonderland",
            date_of_birth=date(2014, 1, 1),
            address_line1="1 Ice Lane",
            city="Springfield",
            state="IL",
            zip_code="62701",
            membership_status="active",
            membership_expiry=date.today() + timedelta(days=30),
        )
        assert s.full_name == "Alice Wonderland"


@pytest.mark.django_db
class TestSkaterIsMinor:
    """Boundary tests for Skater.is_minor (threshold: age < 13)."""

    def test_is_minor_true_young_child(self, skater):
        # skater fixture has DOB=2015-03-15, clearly < 13
        assert skater.is_minor is True

    def test_is_minor_true_one_day_before_13th_birthday(self, db, club, parent_user):
        from apps.members.models import Skater
        today = date.today()
        # 13 years ago tomorrow means they are 12 years + 364 days today
        dob = today.replace(year=today.year - 13) + timedelta(days=1)
        s = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Boundary",
            last_name="Minor",
            date_of_birth=dob,
            address_line1="1 Ice Lane",
            city="Springfield",
            state="IL",
            zip_code="62701",
            membership_status="active",
            membership_expiry=date.today() + timedelta(days=30),
        )
        assert s.is_minor is True

    def test_is_minor_false_exactly_13_today(self, db, club, parent_user):
        from apps.members.models import Skater
        today = date.today()
        # Born exactly 13 years ago → is 13 today → NOT a minor
        dob = today.replace(year=today.year - 13)
        s = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Threshold",
            last_name="Teen",
            date_of_birth=dob,
            address_line1="1 Ice Lane",
            city="Springfield",
            state="IL",
            zip_code="62701",
            membership_status="active",
            membership_expiry=date.today() + timedelta(days=30),
        )
        assert s.is_minor is False

    def test_is_minor_false_adult(self, adult_skater):
        assert adult_skater.is_minor is False


@pytest.mark.django_db
class TestSkaterIsActiveMember:
    def test_active_with_future_expiry(self, skater):
        # Fixture: status=active, expiry=2027-08-31
        assert skater.is_active_member is True

    def test_active_with_expiry_today(self, db, club, parent_user, membership_type):
        from apps.members.models import Skater
        s = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Today",
            last_name="Expire",
            date_of_birth=date(2010, 1, 1),
            address_line1="1 Ice Lane",
            city="Springfield",
            state="IL",
            zip_code="62701",
            membership_type=membership_type,
            membership_status="active",
            membership_expiry=date.today(),
        )
        assert s.is_active_member is True

    def test_false_when_expiry_yesterday(self, db, club, parent_user, membership_type):
        from apps.members.models import Skater
        s = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Past",
            last_name="Expire",
            date_of_birth=date(2010, 1, 1),
            address_line1="1 Ice Lane",
            city="Springfield",
            state="IL",
            zip_code="62701",
            membership_type=membership_type,
            membership_status="active",
            membership_expiry=date.today() - timedelta(days=1),
        )
        assert s.is_active_member is False

    def test_false_when_status_expired(self, db, club, parent_user, membership_type):
        from apps.members.models import Skater
        s = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Bad",
            last_name="Status",
            date_of_birth=date(2010, 1, 1),
            address_line1="1 Ice Lane",
            city="Springfield",
            state="IL",
            zip_code="62701",
            membership_type=membership_type,
            membership_status="expired",
            membership_expiry=date.today() + timedelta(days=365),
        )
        assert s.is_active_member is False

    def test_false_when_status_pending(self, db, club, parent_user, membership_type):
        from apps.members.models import Skater
        s = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="Pending",
            last_name="Member",
            date_of_birth=date(2010, 1, 1),
            address_line1="1 Ice Lane",
            city="Springfield",
            state="IL",
            zip_code="62701",
            membership_type=membership_type,
            membership_status="pending",
            membership_expiry=date.today() + timedelta(days=90),
        )
        assert s.is_active_member is False

    def test_false_when_no_expiry(self, db, club, parent_user, membership_type):
        from apps.members.models import Skater
        s = Skater.objects.create(
            club=club,
            managed_by=parent_user,
            first_name="No",
            last_name="Expiry",
            date_of_birth=date(2010, 1, 1),
            address_line1="1 Ice Lane",
            city="Springfield",
            state="IL",
            zip_code="62701",
            membership_type=membership_type,
            membership_status="active",
            membership_expiry=None,
        )
        assert s.is_active_member is False


@pytest.mark.django_db
class TestSkaterSoftDelete:
    def test_soft_delete_hides_from_default_manager(self, skater):
        from apps.members.models import Skater
        skater_id = skater.id
        skater.soft_delete()
        assert skater.deleted_at is not None
        assert Skater.objects.filter(id=skater_id).exists() is False
        assert Skater.all_objects.filter(id=skater_id).exists() is True
