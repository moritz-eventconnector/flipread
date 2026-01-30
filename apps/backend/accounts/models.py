"""
User Management Models

AUTHENTIK READY: Diese Models und Auth-Logik sind so strukturiert,
dass Authentik später einfach integriert werden kann.

Die Auth-Abstraction befindet sich in:
- accounts/guards.py (Authentication Guards)
- accounts/middleware.py (Optional Auth Middleware)
- accounts/backends.py (Custom Auth Backends)
"""
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom user manager - AUTHENTIK READY"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', User.Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User Model - AUTHENTIK READY
    
    Kann später durch Authentik User ersetzt werden.
    Externe User-ID wird in external_id gespeichert.
    """
    
    class Role(models.TextChoices):
        USER = 'user', 'User'
        ADMIN = 'admin', 'Admin'
    
    # Override username to use email instead
    username = None
    email = models.EmailField(unique=True)
    
    # User fields
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    
    # AUTHENTIK READY: Externe User-ID für Authentik Integration
    external_id = models.CharField(max_length=255, blank=True, null=True, unique=True, db_index=True)
    external_provider = models.CharField(max_length=50, blank=True, null=True)  # 'authentik', 'local', etc.
    
    # Hosting permissions (can be overridden by admin)
    hosting_enabled = models.BooleanField(default=False)
    hosting_enabled_until = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login = models.DateTimeField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.email
    
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser
    
    @property
    def has_active_hosting(self):
        """Check if user has active hosting subscription"""
        if not self.hosting_enabled:
            return False
        if self.hosting_enabled_until and self.hosting_enabled_until < timezone.now():
            return False
        return True
    
    def can_publish(self):
        """Check if user can publish flipbooks"""
        return self.has_active_hosting and self.is_active


class PasswordResetToken(models.Model):
    """Password reset tokens"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'password_reset_tokens'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Password reset for {self.user.email}"

