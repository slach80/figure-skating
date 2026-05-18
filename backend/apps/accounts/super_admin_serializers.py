from rest_framework import serializers

from apps.accounts.models import User
from apps.clubs.models import Club


class ClubListSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Club
        fields = [
            "id",
            "name",
            "slug",
            "email",
            "city",
            "state",
            "is_active",
            "stripe_onboarding_complete",
            "stripe_account_id",
            "member_count",
            "created_at",
        ]

    def get_member_count(self, obj: Club) -> int:
        return obj.users.count()


class UserListSerializer(serializers.ModelSerializer):
    club_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "uuid",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "is_active",
            "club",
            "club_name",
            "date_joined",
        ]

    def get_club_name(self, obj: User) -> str | None:
        return obj.club.name if obj.club else None
