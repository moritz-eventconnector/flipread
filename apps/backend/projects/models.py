"""
Flipbook Project Models
"""
import os
import secrets
import tempfile
from django.db import models
from django.conf import settings
from django.utils import timezone
from accounts.models import User


def project_upload_path(instance, filename):
    """Generate upload path for project PDFs: customer-{user_id}-projekt-{token}/{filename}"""
    # Ensure user is available (should be set by serializer before save)
    # Django may call this before the instance is fully saved, so we need to handle both cases
    if hasattr(instance, 'user') and instance.user and hasattr(instance.user, 'id') and instance.user.id:
        user_id = instance.user.id
    elif hasattr(instance, '_user_id'):
        # Fallback: use stored user_id if available
        user_id = instance._user_id
    else:
        # Last resort: use 0 (shouldn't happen in normal flow, but prevents crash)
        user_id = 0
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"project_upload_path called without user set for filename {filename}")
    return f'customer-{user_id}-projekt-{secrets.token_urlsafe(8)}/{filename}'


class Project(models.Model):
    """Flipbook Project"""
    
    class Status(models.TextChoices):
        UPLOADING = 'uploading', 'Uploading'
        PROCESSING = 'processing', 'Processing'
        READY = 'ready', 'Ready'
        ERROR = 'error', 'Error'
    
    # Basic info
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    description = models.TextField(blank=True)
    
    # Files
    pdf_file = models.FileField(upload_to=project_upload_path)
    pages_json = models.JSONField(null=True, blank=True)  # Metadata about pages
    
    # Status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.UPLOADING)
    error_message = models.TextField(blank=True)
    
    # Processing
    total_pages = models.IntegerField(default=0)
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Download (one-time payment)
    download_enabled = models.BooleanField(default=False)
    download_paid_at = models.DateTimeField(null=True, blank=True)
    download_stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    
    # Publishing (subscription required)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    published_slug = models.SlugField(max_length=255, unique=True, null=True, blank=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['slug']),
            models.Index(fields=['published_slug']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.user.email})"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = self.title.lower().replace(' ', '-')
            # Remove special characters
            base_slug = ''.join(c for c in base_slug if c.isalnum() or c in '-_')
            self.slug = base_slug
            counter = 1
            while Project.objects.filter(slug=self.slug).exclude(id=self.id).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        
        # Ensure published_slug is unique if set
        if self.published_slug:
            existing = Project.objects.filter(published_slug=self.published_slug).exclude(id=self.id).first()
            if existing:
                raise ValueError(f"published_slug '{self.published_slug}' is already in use by another project")
        
        # published_slug wird jetzt in views.py beim Publish gesetzt
        super().save(*args, **kwargs)
    
    @property
    def pages_directory(self):
        """Directory where page images are stored (local only)"""
        if settings.USE_S3:
            # For S3, we use a temporary directory during processing
            return os.path.join(tempfile.gettempdir(), 'flipread', str(self.user.id), str(self.id), 'pages')
        return os.path.join(settings.MEDIA_ROOT, 'projects', str(self.user.id), str(self.id), 'pages')
    
    @property
    def published_directory(self):
        """Directory where published flipbook is stored (local only)"""
        if settings.USE_S3:
            return None  # S3 doesn't use local directories
        if not self.published_slug:
            return None
        return os.path.join(settings.PUBLISHED_ROOT, self.published_slug)
    
    def can_download(self):
        """Check if project can be downloaded"""
        return self.download_enabled and self.status == self.Status.READY
    
    def can_publish(self):
        """Check if project can be published"""
        return (
            self.user.can_publish() and
            self.status == self.Status.READY and
            self.is_published
        )


def project_page_upload_path(instance, filename):
    """Generate upload path for project pages: customer-{user_id}-projekt-{project_id}/pages/{filename}"""
    return f'customer-{instance.project.user.id}-projekt-{instance.project.id}/pages/{filename}'


class ProjectPage(models.Model):
    """Individual page of a flipbook"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='pages')
    page_number = models.IntegerField()
    image_file = models.ImageField(upload_to=project_page_upload_path)
    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'project_pages'
        unique_together = ['project', 'page_number']
        ordering = ['page_number']
    
    def __str__(self):
        return f"{self.project.title} - Page {self.page_number}"

