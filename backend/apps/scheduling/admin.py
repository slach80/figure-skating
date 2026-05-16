from django.contrib import admin
from .models import LessonType, InstructorSlot, LessonBooking


@admin.register(LessonType)
class LessonTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "club", "lesson_format", "skill_level", "duration_minutes", "price", "is_active"]
    list_filter = ["club", "lesson_format", "skill_level", "is_active"]
    search_fields = ["name"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(InstructorSlot)
class InstructorSlotAdmin(admin.ModelAdmin):
    list_display = ["instructor", "club", "lesson_type", "date", "start_time", "end_time", "status", "spots_remaining_display"]
    list_filter = ["club", "status", "recurrence", "date"]
    search_fields = ["instructor__email", "instructor__first_name", "instructor__last_name"]
    readonly_fields = ["id", "current_bookings", "created_at", "updated_at"]
    date_hierarchy = "date"

    def spots_remaining_display(self, obj):
        return obj.spots_remaining
    spots_remaining_display.short_description = "Spots Left"


@admin.register(LessonBooking)
class LessonBookingAdmin(admin.ModelAdmin):
    list_display = ["skater", "instructor", "lesson_type", "scheduled_date", "scheduled_time", "status", "payment_status"]
    list_filter = ["club", "status", "payment_status", "scheduled_date"]
    search_fields = ["skater__first_name", "skater__last_name", "instructor__email"]
    readonly_fields = ["id", "confirmed_at", "completed_at", "cancelled_at", "created_at", "updated_at"]
    date_hierarchy = "scheduled_date"
