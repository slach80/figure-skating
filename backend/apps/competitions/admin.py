from django.contrib import admin
from .models import Competition, EventCategory, CompetitionEntry


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ['name', 'comp_type', 'start_date', 'end_date', 'city', 'state', 'is_published', 'entry_count']
    list_filter = ['comp_type', 'is_published', 'start_date']
    search_fields = ['name', 'venue', 'city', 'sanction_number']
    date_hierarchy = 'start_date'
    readonly_fields = ['created_at', 'updated_at']


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'competition', 'discipline', 'segment', 'level', 'additional_fee', 'max_entries']
    list_filter = ['discipline', 'segment', 'competition']
    search_fields = ['name', 'level', 'competition__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CompetitionEntry)
class CompetitionEntryAdmin(admin.ModelAdmin):
    list_display = [
        'skater', 'competition', 'category', 'status', 'entry_fee', 'is_late',
        'draw_number', 'skating_order', 'placement',
    ]
    list_filter = ['status', 'is_late', 'competition']
    search_fields = ['skater__first_name', 'skater__last_name', 'skater__usfs_number', 'competition__name']
    readonly_fields = ['created_at', 'updated_at', 'scratched_at']
