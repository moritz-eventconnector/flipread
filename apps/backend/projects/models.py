"""
Flipbook Project Models
"""
import os
import secrets
from django.db import models
from django.conf import settings
from django.utils import timezone
from accounts.models import User


def project_upload_path(instance, filename):
    """Generate upload path for project PDFs"""
    return f'projects/{instance.user.id}/{secrets.token_urlsafe(8)}/{filename}'


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
            self.slug = base_slug
            counter = 1
            while Project.objects.filter(slug=self.slug).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        
        if not self.published_slug and self.is_published:
            self.published_slug = f"{self.slug}-{secrets.token_urlsafe(8)}"
        
        super().save(*args, **kwargs)
    
    @property
    def pages_directory(self):
        """Directory where page images are stored"""
        return os.path.join(settings.MEDIA_ROOT, 'projects', str(self.user.id), str(self.id), 'pages')
    
    @property
    def published_directory(self):
        """Directory where published flipbook is stored"""
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


class ProjectPage(models.Model):
    """Individual page of a flipbook"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='pages')
    page_number = models.IntegerField()
    image_file = models.ImageField(upload_to='projects/pages/')
    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'project_pages'
        unique_together = ['project', 'page_number']
        ordering = ['page_number']
    
    def __str__(self):
        return f"{self.project.title} - Page {self.page_number}"

