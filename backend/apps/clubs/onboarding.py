import re

from rest_framework import serializers

from apps.accounts.models import User
from apps.clubs.models import Club


class ClubOnboardingSerializer(serializers.Serializer):
    # Club fields
    club_name = serializers.CharField(max_length=200)
    club_slug = serializers.SlugField(max_length=50)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    state = serializers.CharField(max_length=2, required=False, allow_blank=True, default='')
    zip_code = serializers.CharField(max_length=10, required=False, allow_blank=True, default='')
    primary_color = serializers.CharField(max_length=7, default='#5B2C91')
    accent_color = serializers.CharField(max_length=7, default='#D946EF')

    # Season fields
    current_season_start = serializers.DateField(required=False, allow_null=True, default=None)
    current_season_end = serializers.DateField(required=False, allow_null=True, default=None)
    season_label = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')

    # Admin account fields
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(min_length=8, write_only=True)

    _HEX_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')

    def validate_club_slug(self, value: str) -> str:
        if Club.objects.filter(slug=value).exists():
            raise serializers.ValidationError("slug already taken")
        return value

    def validate_admin_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("email already registered")
        return value

    def validate_primary_color(self, value: str) -> str:
        if not self._HEX_RE.match(value):
            raise serializers.ValidationError("Must be a valid hex color (e.g. #5B2C91).")
        return value

    def validate_accent_color(self, value: str) -> str:
        if not self._HEX_RE.match(value):
            raise serializers.ValidationError("Must be a valid hex color (e.g. #D946EF).")
        return value
