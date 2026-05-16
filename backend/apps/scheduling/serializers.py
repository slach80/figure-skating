from rest_framework import serializers
from django.utils import timezone
from apps.scheduling.models import LessonType, InstructorSlot, LessonBooking


class LessonTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonType
        fields = ['id', 'name', 'lesson_format', 'skill_level', 'duration_minutes', 'price', 'drop_in_price', 'max_participants', 'color', 'is_active']
        read_only_fields = ['id', 'name', 'lesson_format', 'skill_level', 'duration_minutes', 'price', 'drop_in_price', 'max_participants', 'color', 'is_active']


class InstructorSlotSerializer(serializers.ModelSerializer):
    lesson_type = LessonTypeSerializer(read_only=True)
    effective_price = serializers.SerializerMethodField(read_only=True)
    spots_remaining = serializers.SerializerMethodField(read_only=True)
    is_available = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = InstructorSlot
        fields = [
            'id',
            'instructor',
            'lesson_type',
            'date',
            'start_time',
            'end_time',
            'rink_location',
            'recurrence',
            'recurrence_end_date',
            'max_bookings',
            'current_bookings',
            'status',
            'price_override',
            'effective_price',
            'spots_remaining',
            'is_available',
        ]
        read_only_fields = [
            'id',
            'lesson_type',
            'effective_price',
            'spots_remaining',
            'is_available',
        ]

    def get_effective_price(self, obj):
        return str(obj.effective_price)

    def get_spots_remaining(self, obj):
        return obj.spots_remaining

    def get_is_available(self, obj):
        return obj.is_available


class LessonBookingSerializer(serializers.ModelSerializer):
    lesson_type = LessonTypeSerializer(read_only=True)
    can_cancel = serializers.SerializerMethodField(read_only=True)
    can_reschedule = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = LessonBooking
        fields = [
            'id',
            'skater',
            'instructor',
            'availability_slot',
            'lesson_type',
            'scheduled_date',
            'scheduled_time',
            'duration_minutes',
            'status',
            'payment_status',
            'amount_paid',
            'cancellation_reason',
            'skater_notes',
            'lesson_notes',
            'confirmed_at',
            'completed_at',
            'can_cancel',
            'can_reschedule',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'lesson_type',
            'can_cancel',
            'can_reschedule',
            'confirmed_at',
            'completed_at',
            'created_at',
        ]

    def validate_scheduled_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Scheduled date cannot be in the past.")
        return value

    def get_can_cancel(self, obj):
        return obj.can_cancel

    def get_can_reschedule(self, obj):
        return obj.can_reschedule
