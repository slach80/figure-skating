from django.contrib import admin
from .models import Coach, LessonType, AvailabilitySlot, Booking, LessonPackage, PurchasedPackage, TestSession, TestRegistration


@admin.register(Coach)
class CoachAdmin(admin.ModelAdmin):
    list_display = ["__str__", "club", "specialties", "is_active", "created_at"]
    list_filter = ["club", "is_active"]
    search_fields = ["user__first_name", "user__last_name", "user__email", "specialties"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["user"]


@admin.register(LessonType)
class LessonTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "club", "lesson_format", "duration_minutes", "price", "max_participants", "is_active"]
    list_filter = ["club", "lesson_format", "is_active"]
    search_fields = ["name", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(AvailabilitySlot)
class AvailabilitySlotAdmin(admin.ModelAdmin):
    list_display = ["coach", "club", "lesson_type", "date", "start_time", "end_time", "status", "spots_remaining_display", "recurrence"]
    list_filter = ["club", "status", "recurrence", "date"]
    search_fields = ["coach__user__email", "coach__user__first_name", "coach__user__last_name"]
    readonly_fields = ["id", "current_bookings", "created_at", "updated_at"]
    date_hierarchy = "date"
    raw_id_fields = ["coach", "lesson_type", "parent_slot"]

    def spots_remaining_display(self, obj):
        return obj.spots_remaining
    spots_remaining_display.short_description = "Spots Left"


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ["skater", "coach", "lesson_type", "scheduled_date", "scheduled_time", "status", "payment_status", "amount_paid"]
    list_filter = ["club", "status", "payment_status", "scheduled_date"]
    search_fields = [
        "skater__first_name", "skater__last_name",
        "coach__user__email", "coach__user__first_name", "coach__user__last_name",
    ]
    readonly_fields = ["id", "cancelled_at", "created_at", "updated_at"]
    date_hierarchy = "scheduled_date"
    raw_id_fields = ["skater", "coach", "availability_slot", "lesson_type", "cancelled_by", "rescheduled_from"]


@admin.register(LessonPackage)
class LessonPackageAdmin(admin.ModelAdmin):
    list_display = ["name", "club", "lesson_type", "lesson_count", "price", "price_per_lesson_display", "savings_display", "is_active"]
    list_filter = ["club", "lesson_type", "is_active"]
    search_fields = ["name", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["lesson_type"]

    def price_per_lesson_display(self, obj):
        return f"${obj.price_per_lesson:.2f}"
    price_per_lesson_display.short_description = "$/Lesson"

    def savings_display(self, obj):
        savings = obj.savings_vs_individual
        return f"${savings:.2f}" if savings > 0 else "—"
    savings_display.short_description = "Savings"


@admin.register(PurchasedPackage)
class PurchasedPackageAdmin(admin.ModelAdmin):
    list_display = ["skater", "package", "lessons_total", "lessons_used", "lessons_remaining_display", "payment_status", "purchased_at", "expires_at"]
    list_filter = ["club", "payment_status", "package__lesson_type"]
    search_fields = ["skater__first_name", "skater__last_name", "package__name"]
    readonly_fields = ["id", "lessons_used", "purchased_at", "created_at", "updated_at"]
    raw_id_fields = ["skater", "package"]
    date_hierarchy = "purchased_at"

    def lessons_remaining_display(self, obj):
        return obj.lessons_remaining
    lessons_remaining_display.short_description = "Remaining"


@admin.register(TestSession)
class TestSessionAdmin(admin.ModelAdmin):
    list_display = ["name", "club", "date", "location", "judge_name", "fee_per_test", "max_registrations", "is_open", "registration_count_display"]
    list_filter = ["club", "is_open", "date"]
    search_fields = ["name", "location", "judge_name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    date_hierarchy = "date"

    def registration_count_display(self, obj):
        return obj.registrations.count()
    registration_count_display.short_description = "Registered"


@admin.register(TestRegistration)
class TestRegistrationAdmin(admin.ModelAdmin):
    list_display = ["skater", "test_session", "test_types", "result", "payment_status", "amount_paid"]
    list_filter = ["club", "result", "payment_status", "test_session"]
    search_fields = ["skater__first_name", "skater__last_name", "test_session__name"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["skater", "test_session"]
