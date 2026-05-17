"""View tests for apps/members."""
import pytest
from rest_framework.test import APIClient


def make_authed_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def other_club(db):
    from apps.clubs.models import Club
    return Club.objects.create(
        name="Rival FSC",
        slug="rival-fsc",
        email="admin@rivalfsc.com",
    )


@pytest.fixture
def other_club_admin(db, other_club):
    from apps.accounts.models import User
    return User.objects.create_user(
        email="admin@rivalfsc.com",
        password="pass123",
        club=other_club,
        role="admin",
        first_name="Rival",
        last_name="Admin",
    )


@pytest.fixture
def other_skater(db, other_club, other_club_admin, membership_type):
    """A skater belonging to other_club using a separate membership_type."""
    from datetime import date, timedelta
    from apps.members.models import MembershipType, Skater
    mt = MembershipType.objects.create(
        club=other_club,
        name="Juvenile",
        usfs_category="Juvenile",
        price_in_club="85.00",
        price_out_of_club="110.00",
    )
    return Skater.objects.create(
        club=other_club,
        managed_by=other_club_admin,
        first_name="Rival",
        last_name="Skater",
        date_of_birth=date(2013, 5, 1),
        address_line1="1 Rival Rink",
        city="Rival City",
        state="KS",
        zip_code="66101",
        membership_type=mt,
        membership_status="active",
        membership_expiry=date.today() + timedelta(days=60),
    )


# ---------------------------------------------------------------------------
# SkaterViewSet — `me` action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSkaterMeAction:
    def test_me_returns_404_when_no_skater_linked(self, admin_user, club):
        """admin_user has no skater_profile → 404."""
        client = make_authed_client(admin_user)
        resp = client.get("/api/v1/members/me/")
        assert resp.status_code == 404

    def test_me_returns_skater_data_when_linked(self, db, club, parent_user, skater):
        """parent_user manages skater but is not the skater's user; create a user-linked skater."""
        from datetime import date, timedelta
        from apps.members.models import Skater
        # Create a skater linked directly to parent_user via OneToOne
        linked_skater = Skater.objects.create(
            club=club,
            user=parent_user,
            first_name="Self",
            last_name="Managed",
            date_of_birth=date(1995, 1, 1),
            address_line1="1 Ice Lane",
            city="Kansas City",
            state="MO",
            zip_code="64111",
            membership_status="active",
            membership_expiry=date.today() + timedelta(days=30),
        )
        client = make_authed_client(parent_user)
        resp = client.get("/api/v1/members/me/")
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Self"
        assert resp.json()["last_name"] == "Managed"


# ---------------------------------------------------------------------------
# SkaterViewSet — `renew` action
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSkaterRenewAction:
    def test_renew_missing_membership_type_id_returns_400(self, admin_user, club, skater):
        client = make_authed_client(admin_user)
        url = f"/api/v1/members/{skater.id}/renew/"
        resp = client.post(url, {}, format="json")
        assert resp.status_code == 400
        assert "membership_type_id" in resp.json()

    def test_renew_invalid_membership_type_returns_400(self, admin_user, club, skater):
        import uuid
        client = make_authed_client(admin_user)
        url = f"/api/v1/members/{skater.id}/renew/"
        resp = client.post(url, {"membership_type_id": str(uuid.uuid4())}, format="json")
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Club data isolation — member from club A cannot see members from club B
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestClubDataIsolation:
    def test_admin_cannot_see_other_club_skaters(
        self, admin_user, club, skater, other_club_admin, other_skater
    ):
        # Club A admin lists members — should NOT see other_skater
        client = make_authed_client(admin_user)
        resp = client.get("/api/v1/members/")
        assert resp.status_code == 200
        data = resp.json()
        if isinstance(data, dict) and "results" in data:
            ids = [item["id"] for item in data["results"]]
        else:
            ids = [item["id"] for item in data]
        assert str(skater.id) in ids
        assert str(other_skater.id) not in ids

    def test_other_club_admin_cannot_see_first_club_skaters(
        self, admin_user, club, skater, other_club_admin, other_skater
    ):
        # Club B admin lists members — should NOT see skater from club A
        client = make_authed_client(other_club_admin)
        resp = client.get("/api/v1/members/")
        assert resp.status_code == 200
        data = resp.json()
        if isinstance(data, dict) and "results" in data:
            ids = [item["id"] for item in data["results"]]
        else:
            ids = [item["id"] for item in data]
        assert str(other_skater.id) in ids
        assert str(skater.id) not in ids
