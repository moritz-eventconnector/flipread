from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, PasswordResetToken, LoginCode, EmailVerificationToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """User Admin - AUTHENTIK READY"""
    list_display = ('email', 'role', 'is_active', 'hosting_enabled', 'has_active_hosting', 'created_at')
    list_filter = ('role', 'is_active', 'hosting_enabled', 'is_email_verified', 'created_at')
    search_fields = ('email', 'external_id')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'role')}),
        ('Hosting', {'fields': ('hosting_enabled', 'hosting_enabled_until')}),
        ('Email', {'fields': ('is_email_verified',)}),
        ('AUTHENTIK', {'fields': ('external_id', 'external_provider'), 'classes': ('collapse',)}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role'),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login')


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'created_at', 'expires_at', 'used')
    list_filter = ('used', 'created_at')
    search_fields = ('user__email', 'token')
    readonly_fields = ('token', 'created_at')


@admin.register(LoginCode)
class LoginCodeAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'created_at', 'expires_at', 'used', 'ip_address')
    list_filter = ('used', 'created_at', 'expires_at')
    search_fields = ('user__email', 'code', 'ip_address')
    readonly_fields = ('code', 'created_at')
    ordering = ('-created_at',)


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'created_at', 'expires_at', 'used')
    list_filter = ('used', 'created_at', 'expires_at')
    search_fields = ('user__email', 'token')
    readonly_fields = ('token', 'created_at')
    ordering = ('-created_at',)

