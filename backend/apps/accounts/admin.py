from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, FamilyGroup


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = ['email', 'first_name', 'last_name', 'club', 'role', 'is_active']
    list_filter = ['club', 'role', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    readonly_fields = ['uuid', 'date_joined', 'last_login']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Club & Role', {'fields': ('club', 'role', 'family_group', 'is_primary_contact')}),
        ('Stripe', {'fields': ('stripe_customer_id',)}),
        ('Security', {'fields': ('age_verified',)}),
        ('Important dates', {'fields': ('date_joined', 'last_login')}),
        ('System', {'fields': ('uuid',)}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2'),
        }),
    )


@admin.register(FamilyGroup)
class FamilyGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'club', 'created_at']
    list_filter = ['club']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at', 'updated_at']
