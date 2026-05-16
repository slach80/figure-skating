from django.contrib import admin
from .models import Club


@admin.register(Club)
class ClubAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'city', 'state', 'stripe_onboarding_complete', 'is_active', 'created_at']
    list_filter = ['is_active', 'stripe_onboarding_complete', 'created_at']
    search_fields = ['name', 'email', 'slug']
    readonly_fields = ['id', 'created_at', 'updated_at']
    prepopulated_fields = {'slug': ('name',)}
    fieldsets = (
        ('Basics', {
            'fields': ('id', 'name', 'slug', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'website_url')
        }),
        ('Branding', {
            'fields': ('logo', 'primary_color', 'accent_color')
        }),
        ('Stripe Connect', {
            'fields': ('stripe_account_id', 'stripe_onboarding_complete')
        }),
        ('Season', {
            'fields': ('current_season_start', 'current_season_end', 'season_label')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )
