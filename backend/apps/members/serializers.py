from rest_framework import serializers
from apps.members.models import MembershipType, Skater


class MembershipTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipType
        fields = ['id', 'name', 'usfs_category', 'price_in_club', 'price_out_of_club', 'is_family_plan', 'is_active']
        read_only_fields = ['id', 'name', 'usfs_category', 'price_in_club', 'price_out_of_club', 'is_family_plan', 'is_active']


class SkaterListSerializer(serializers.ModelSerializer):
    is_minor = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Skater
        fields = ['id', 'first_name', 'last_name', 'usfs_number', 'membership_status', 'membership_expiry', 'is_minor']
        read_only_fields = ['id', 'first_name', 'last_name', 'usfs_number', 'membership_status', 'membership_expiry', 'is_minor']

    def get_is_minor(self, obj):
        return obj.is_minor


class SkaterDetailSerializer(serializers.ModelSerializer):
    membership_type_display = MembershipTypeSerializer(source='membership_type', read_only=True)
    is_minor = serializers.SerializerMethodField(read_only=True)
    is_active_member = serializers.SerializerMethodField(read_only=True)
    managed_by_email = serializers.SerializerMethodField(read_only=True)
    managed_by = serializers.PrimaryKeyRelatedField(
        queryset=None,
        write_only=True
    )

    class Meta:
        model = Skater
        fields = [
            'id',
            'user',
            'managed_by',
            'managed_by_email',
            'family_group',
            'first_name',
            'last_name',
            'middle_name',
            'preferred_name',
            'date_of_birth',
            'gender',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'zip_code',
            'phone',
            'email',
            'usfs_number',
            'membership_type',
            'membership_type_display',
            'membership_expiry',
            'membership_status',
            'skater_stats_slug',
            'skater_stats_last_synced',
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relation',
            'medical_notes',
            'name_pronunciation',
            'is_minor',
            'is_active_member',
        ]
        read_only_fields = [
            'id',
            'user',
            'membership_type_display',
            'is_minor',
            'is_active_member',
            'skater_stats_last_synced',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request, 'club'):
            self.fields['managed_by'].queryset = request.club.users.all()

    def validate_usfs_number(self, value):
        if value and not value.isdigit() or (value and (len(value) < 6 or len(value) > 10)):
            raise serializers.ValidationError(
                "USFS number must be 6 to 10 digits if provided."
            )
        return value

    def validate_date_of_birth(self, value):
        from django.utils import timezone
        if value >= timezone.now().date():
            raise serializers.ValidationError("Date of birth must be in the past.")
        return value

    def get_is_minor(self, obj):
        return obj.is_minor

    def get_is_active_member(self, obj):
        return obj.is_active_member

    def get_managed_by_email(self, obj):
        return obj.managed_by.email if obj.managed_by else None
