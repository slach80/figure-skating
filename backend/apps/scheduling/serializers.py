from rest_framework import serializers
from django.utils import timezone
from .models import Coach, LessonType, AvailabilitySlot, Booking, CoachEvaluation, LessonPackage, PurchasedPackage, TestSession, TestRegistration


class CoachListSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Coach
        fields = ["id", "user_name", "specialties", "is_active"]

    def get_user_name(self, obj):
        return obj.user.get_full_name()


class CoachDetailSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = Coach
        fields = ["id", "user_name", "user_email", "bio", "specialties", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_user_name(self, obj):
        return obj.user.get_full_name()

    def get_user_email(self, obj):
        return obj.user.email


class LessonTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonType
        fields = [
            "id", "name", "description", "lesson_format", "duration_minutes",
            "price", "drop_in_price", "max_participants", "color", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AvailabilitySlotSerializer(serializers.ModelSerializer):
    coach = CoachListSerializer(read_only=True)
    coach_id = serializers.UUIDField(write_only=True)
    lesson_type = LessonTypeSerializer(read_only=True)
    lesson_type_id = serializers.UUIDField(write_only=True)
    spots_remaining = serializers.SerializerMethodField()
    effective_price = serializers.SerializerMethodField()

    class Meta:
        model = AvailabilitySlot
        fields = [
            "id", "coach", "coach_id", "lesson_type", "lesson_type_id",
            "date", "start_time", "end_time", "recurrence", "recurrence_end_date",
            "parent_slot", "max_bookings", "current_bookings", "status",
            "price_override", "effective_price", "spots_remaining", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "current_bookings", "status", "effective_price",
            "spots_remaining", "created_at", "updated_at",
        ]

    def get_spots_remaining(self, obj):
        return obj.spots_remaining

    def get_effective_price(self, obj):
        return str(obj.effective_price)


class BookingListSerializer(serializers.ModelSerializer):
    skater_name = serializers.SerializerMethodField()
    coach_name = serializers.SerializerMethodField()
    lesson_type_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "skater_name", "coach_name", "lesson_type_name",
            "scheduled_date", "scheduled_time", "status", "payment_status", "amount_paid",
        ]

    def get_skater_name(self, obj):
        return str(obj.skater)

    def get_coach_name(self, obj):
        return obj.coach.user.get_full_name()

    def get_lesson_type_name(self, obj):
        return obj.lesson_type.name


class BookingDetailSerializer(serializers.ModelSerializer):
    skater_name = serializers.SerializerMethodField()
    coach = CoachListSerializer(read_only=True)
    coach_id = serializers.UUIDField(write_only=True)
    lesson_type = LessonTypeSerializer(read_only=True)
    lesson_type_id = serializers.UUIDField(write_only=True)
    can_cancel = serializers.SerializerMethodField()
    can_reschedule = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id", "skater", "skater_name", "coach", "coach_id",
            "availability_slot", "lesson_type", "lesson_type_id",
            "scheduled_date", "scheduled_time", "duration_minutes",
            "status", "payment_status", "amount_paid",
            "cancellation_reason", "cancellation_notes", "cancelled_at", "cancelled_by",
            "rescheduled_from", "client_notes", "coach_notes",
            "can_cancel", "can_reschedule",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "cancelled_at", "cancelled_by",
            "can_cancel", "can_reschedule",
            "created_at", "updated_at",
        ]

    def get_skater_name(self, obj):
        return str(obj.skater)

    def get_can_cancel(self, obj):
        return obj.can_cancel

    def get_can_reschedule(self, obj):
        return obj.can_reschedule


class CoachEvaluationSerializer(serializers.ModelSerializer):
    skater_name = serializers.CharField(source='skater.full_name', read_only=True)
    coach_name = serializers.SerializerMethodField()
    average_score = serializers.FloatField(read_only=True)

    class Meta:
        model = CoachEvaluation
        fields = '__all__'
        read_only_fields = ['id', 'club', 'created_at', 'updated_at']

    def get_coach_name(self, obj):
        return obj.coach.user.get_full_name()


class LessonPackageSerializer(serializers.ModelSerializer):
    lesson_type_name = serializers.CharField(source='lesson_type.name', read_only=True)
    price_per_lesson = serializers.DecimalField(source='price_per_lesson', max_digits=8, decimal_places=2, read_only=True)
    savings_vs_individual = serializers.DecimalField(source='savings_vs_individual', max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = LessonPackage
        fields = '__all__'
        read_only_fields = ['id', 'club', 'created_at', 'updated_at']


class PurchasedPackageSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source='package.name', read_only=True)
    lesson_type_name = serializers.CharField(source='package.lesson_type.name', read_only=True)
    lessons_remaining = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    skater_name = serializers.CharField(source='skater.full_name', read_only=True)

    class Meta:
        model = PurchasedPackage
        fields = '__all__'
        read_only_fields = ['id', 'club', 'lessons_used', 'created_at', 'updated_at']


class TestSessionSerializer(serializers.ModelSerializer):
    spots_remaining = serializers.IntegerField(read_only=True)
    is_registration_open = serializers.BooleanField(read_only=True)
    registration_count = serializers.SerializerMethodField()

    def get_registration_count(self, obj):
        return obj.registrations.count()

    class Meta:
        model = TestSession
        fields = '__all__'
        read_only_fields = ['id', 'club', 'created_at', 'updated_at']


class TestRegistrationSerializer(serializers.ModelSerializer):
    skater_name = serializers.CharField(source='skater.full_name', read_only=True)
    skater_usfs = serializers.CharField(source='skater.usfs_number', read_only=True)
    fee = serializers.DecimalField(source='fee', max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = TestRegistration
        fields = '__all__'
        read_only_fields = ['id', 'club', 'created_at', 'updated_at', 'amount_paid', 'payment_status']


class AvailableSlotSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the public available-slots endpoint."""
    coach_name = serializers.SerializerMethodField()
    lesson_type_name = serializers.CharField(source='lesson_type.name', read_only=True)
    lesson_type_duration_minutes = serializers.IntegerField(source='lesson_type.duration_minutes', read_only=True)
    lesson_type_color = serializers.CharField(source='lesson_type.color', read_only=True)
    start_datetime = serializers.SerializerMethodField()
    end_datetime = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    spots_remaining = serializers.SerializerMethodField()
    is_recurring = serializers.SerializerMethodField()

    class Meta:
        model = AvailabilitySlot
        fields = [
            'id', 'coach_name', 'lesson_type_name', 'lesson_type_duration_minutes',
            'lesson_type_color', 'start_datetime', 'end_datetime',
            'price', 'spots_remaining', 'is_recurring',
        ]

    def get_coach_name(self, obj):
        return obj.coach.user.get_full_name()

    def get_start_datetime(self, obj):
        from datetime import datetime
        dt = datetime.combine(obj.date, obj.start_time)
        return dt.isoformat()

    def get_end_datetime(self, obj):
        from datetime import datetime
        dt = datetime.combine(obj.date, obj.end_time)
        return dt.isoformat()

    def get_price(self, obj):
        return str(obj.effective_price)

    def get_spots_remaining(self, obj):
        return obj.spots_remaining

    def get_is_recurring(self, obj):
        return obj.recurrence != AvailabilitySlot.RECURRENCE_NONE


class BookingCreateSerializer(serializers.Serializer):
    """Validates the input for member-facing booking creation."""
    slot = serializers.UUIDField()
    skater_id = serializers.UUIDField()
    payment_method = serializers.ChoiceField(choices=['package', 'drop_in'], default='drop_in')
    package_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, data):
        from apps.members.models import Skater
        try:
            data['skater'] = Skater.objects.get(id=data['skater_id'])
        except Skater.DoesNotExist:
            raise serializers.ValidationError({'skater_id': 'Skater not found.'})
        if data.get('payment_method') == 'package' and not data.get('package_id'):
            raise serializers.ValidationError({'package_id': 'Required when payment_method is package.'})
        return data


class MyPurchasedPackageSerializer(serializers.ModelSerializer):
    """Compact serializer for the /packages/my/ endpoint."""
    package_name = serializers.CharField(source='package.name', read_only=True)
    lesson_type_name = serializers.CharField(source='package.lesson_type.name', read_only=True)
    sessions_remaining = serializers.IntegerField(source='lessons_remaining', read_only=True)
    expiry_date = serializers.DateField(source='expires_at', read_only=True)
    skater_name = serializers.CharField(source='skater.full_name', read_only=True)

    class Meta:
        model = PurchasedPackage
        fields = ['id', 'package_name', 'lesson_type_name', 'sessions_remaining', 'expiry_date', 'skater_name', 'skater']
