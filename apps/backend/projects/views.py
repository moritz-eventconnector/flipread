from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from django.http import FileResponse, Http404
from django.utils import timezone
import os
import zipfile
import shutil
import secrets

from .models import Project, ProjectPage
from .serializers import ProjectSerializer, ProjectCreateSerializer
from .tasks import process_pdf_task


class ProjectViewSet(viewsets.ModelViewSet):
    """Project ViewSet"""
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Project.objects.all()
        return Project.objects.filter(user=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer
    
    def perform_create(self, serializer):
        project = serializer.save()
        # Start async processing
        process_pdf_task.delay(project.id)
    
    @action(detail=True, methods=['get'])
    def preview(self, request, slug=None):
        """Preview flipbook (only for owner)"""
        project = self.get_object()
        
        if project.user != request.user and not request.user.is_admin:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if project.status != Project.Status.READY:
            return Response(
                {'error': 'Project not ready'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ensure serializer has request context for absolute URLs
        serializer = self.get_serializer(project, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def download(self, request, slug=None):
        """Download flipbook as ZIP (requires payment)"""
        project = self.get_object()
        
        if project.user != request.user and not request.user.is_admin:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not project.can_download():
            return Response(
                {'error': 'Download not available. Payment required.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Create ZIP file
        zip_path = os.path.join(settings.MEDIA_ROOT, 'downloads', f"{project.slug}.zip")
        os.makedirs(os.path.dirname(zip_path), exist_ok=True)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add pages
            pages_dir = project.pages_directory
            if os.path.exists(pages_dir):
                for page in project.pages.all().order_by('page_number'):
                    if page.image_file and os.path.exists(page.image_file.path):
                        arcname = f"pages/page-{page.page_number:03d}.jpg"
                        zipf.write(page.image_file.path, arcname)
            
            # Add pages.json
            if project.pages_json:
                import json
                zipf.writestr('pages.json', json.dumps(project.pages_json, indent=2))
        
        # Use context manager for file response
        response = FileResponse(
            open(zip_path, 'rb'),
            as_attachment=True,
            filename=f"{project.slug}.zip"
        )
        response['Content-Type'] = 'application/zip'
        return response
    
    @action(detail=True, methods=['post'])
    def publish(self, request, slug=None):
        """Publish flipbook (requires active subscription)"""
        project = self.get_object()
        
        if project.user != request.user and not request.user.is_admin:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if project.status != Project.Status.READY:
            return Response(
                {'error': 'Project not ready'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not project.user.can_publish():
            return Response(
                {'error': 'Active hosting subscription required'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Generate published slug if not exists
        if not project.published_slug:
            project.published_slug = f"{project.slug}-{secrets.token_urlsafe(8)}"
        
        # Generate published version
        from .tasks import publish_flipbook_task
        publish_flipbook_task.delay(project.id)
        
        project.is_published = True
        project.published_at = timezone.now()
        project.save()
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def unpublish(self, request, slug=None):
        """Unpublish flipbook"""
        project = self.get_object()
        
        if project.user != request.user and not request.user.is_admin:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        project.is_published = False
        project.save()
        
        # Optionally delete published files
        if project.published_directory and os.path.exists(project.published_directory):
            shutil.rmtree(project.published_directory)
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)

