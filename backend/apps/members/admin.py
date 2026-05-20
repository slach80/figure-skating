from django.contrib import admin
from django.utils.html import format_html
from .models import Skater, MembershipType, ConsentRecord


@admin.register(Skater)
class SkaterAdmin(admin.ModelAdmin):
    list_display = ['full_name_display', 'club', 'usfs_number', 'membership_type', 'membership_status', 'membership_expiry', 'is_minor_display']
    list_filter = ['club', 'membership_status', 'membership_type', 'gender']
    search_fields = ['first_name', 'last_name', 'usfs_number', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'skater_stats_last_synced']
    actions = ['bulk_activate', 'bulk_expire']
    fieldsets = (
        ('Personal', {
            'fields': ('id', 'first_name', 'last_name', 'middle_name', 'preferred_name', 'date_of_birth', 'gender', 'name_pronunciation')
        }),
        ('Contact', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'zip_code', 'phone', 'email')
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation')
        }),
        ('USFS Registration', {
            'fields': ('usfs_number', 'membership_type', 'membership_status', 'membership_expiry')
        }),
        ('Auth & Management', {
            'fields': ('club', 'user', 'managed_by', 'family_group')
        }),
        ('Skater-Stats', {
            'fields': ('skater_stats_slug', 'skater_stats_last_synced')
        }),
        ('Medical', {
            'fields': ('medical_notes',)
        }),
        ('System', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    def full_name_display(self, obj):
        return obj.full_name
    full_name_display.short_description = 'Full Name'

    def is_minor_display(self, obj):
        if obj.is_minor:
            return format_html('<img src="/static/admin/img/icon-yes.svg" alt="True">')
        return format_html('<img src="/static/admin/img/icon-no.svg" alt="False">')
    is_minor_display.short_description = 'Minor'
    is_minor_display.boolean = True

    def bulk_activate(self, request, queryset):
        updated = queryset.update(membership_status='active')
        self.message_user(request, f'{updated} skater(s) activated.')
    bulk_activate.short_description = 'Activate selected skaters'

    def bulk_expire(self, request, queryset):
        updated = queryset.update(membership_status='expired')
        self.message_user(request, f'{updated} skater(s) expired.')
    bulk_expire.short_description = 'Expire selected skaters'


@admin.register(MembershipType)
class MembershipTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'club', 'price_in_club', 'price_out_of_club', 'is_active', 'is_skating']
    list_filter = ['club', 'is_active', 'is_skating']
    search_fields = ['name']


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = ['skater', 'guardian', 'consent_type', 'granted_at', 'revoked_at', 'is_active_display']
    list_filter = ['consent_type']
    readonly_fields = ['id', 'granted_at', 'ip_address', 'user_agent', 'consent_text']

    def is_active_display(self, obj):
        if obj.is_active:
            return format_html('<img src="/static/admin/img/icon-yes.svg" alt="True">')
        return format_html('<img src="/static/admin/img/icon-no.svg" alt="False">')
    is_active_display.short_description = 'Active'
    is_active_display.boolean = True

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
