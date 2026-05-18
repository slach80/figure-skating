from django.contrib import admin
from apps.waivers.models import WaiverSignature, WaiverTemplate


@admin.register(WaiverTemplate)
class WaiverTemplateAdmin(admin.ModelAdmin):
    list_display = ["title", "version", "club", "requires_guardian_signature", "is_active", "created_at"]
    list_filter = ["club", "is_active", "requires_guardian_signature"]
    search_fields = ["title", "version"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(WaiverSignature)
class WaiverSignatureAdmin(admin.ModelAdmin):
    list_display = ["skater", "template", "signed_by", "signed_at", "season_year", "agreed", "ip_address"]
    list_filter = ["season_year", "agreed", "template"]
    search_fields = ["skater__first_name", "skater__last_name", "signed_by__email"]
    readonly_fields = ["id", "template", "skater", "signed_by", "signed_at", "ip_address", "agreed", "season_year"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
