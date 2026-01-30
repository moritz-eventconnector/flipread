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
import io
import tempfile

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
        
        # Create ZIP in memory
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add pages
            for page in project.pages.all().order_by('page_number'):
                if page.image_file:
                    try:
                        if settings.USE_S3:
                            # Read from S3
                            image_content = page.image_file.read()
                        else:
                            # Read from local filesystem
                            if os.path.exists(page.image_file.path):
                                with open(page.image_file.path, 'rb') as f:
                                    image_content = f.read()
                            else:
                                continue
                        
                        arcname = f"pages/page-{page.page_number:03d}.jpg"
                        zipf.writestr(arcname, image_content)
                    except Exception as e:
                        # Skip page if can't read
                        continue
            
            # Add pages.json
            if project.pages_json:
                import json
                zipf.writestr('pages.json', json.dumps(project.pages_json, indent=2))
        
        # Return ZIP file
        zip_buffer.seek(0)
        response = FileResponse(
            zip_buffer,
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
        
        # Get custom published_slug from request or generate one
        custom_slug = request.data.get('published_slug', '').strip()
        if custom_slug:
            # Validate custom slug
            import re
            if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', custom_slug):
                return Response(
                    {'error': 'Published URL darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if len(custom_slug) < 3:
                return Response(
                    {'error': 'Published URL muss mindestens 3 Zeichen lang sein.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if Project.objects.filter(published_slug=custom_slug).exclude(id=project.id).exists():
                return Response(
                    {'error': 'Diese URL ist bereits vergeben. Bitte wählen Sie eine andere.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            project.published_slug = custom_slug
        elif not project.published_slug:
            # Generate published slug if not exists and no custom slug provided
            project.published_slug = f"{project.slug}-{secrets.token_urlsafe(8)}"
        
        # Generate published version
        from .tasks import publish_flipbook_task
        publish_flipbook_task.delay(project.id)
        
        project.is_published = True
        project.published_at = timezone.now()
        project.save()
        
        serializer = self.get_serializer(project, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch', 'put'])
    def update_published_slug(self, request, slug=None):
        """Update published_slug for a published project"""
        project = self.get_object()
        
        if project.user != request.user and not request.user.is_admin:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not project.is_published:
            return Response(
                {'error': 'Project is not published'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_slug = request.data.get('published_slug', '').strip()
        if not new_slug:
            return Response(
                {'error': 'published_slug is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate slug format
        import re
        if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', new_slug):
            return Response(
                {'error': 'Published URL darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_slug) < 3:
            return Response(
                {'error': 'Published URL muss mindestens 3 Zeichen lang sein.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(new_slug) > 255:
            return Response(
                {'error': 'Published URL darf maximal 255 Zeichen lang sein.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check uniqueness
        if Project.objects.filter(published_slug=new_slug).exclude(id=project.id).exists():
            return Response(
                {'error': 'Diese URL ist bereits vergeben. Bitte wählen Sie eine andere.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update published_slug
        old_slug = project.published_slug
        project.published_slug = new_slug
        project.save()
        
        # Rename published directory if it exists (local only)
        if not settings.USE_S3 and old_slug and project.published_directory:
            old_dir = os.path.join(settings.PUBLISHED_ROOT, old_slug)
            new_dir = os.path.join(settings.PUBLISHED_ROOT, new_slug)
            if os.path.exists(old_dir) and not os.path.exists(new_dir):
                os.rename(old_dir, new_dir)
        elif settings.USE_S3 and old_slug:
            # For S3, we need to copy files from old path to new path
            from .storage import PublishedStorage
            storage = PublishedStorage()
            # Note: S3 doesn't support rename, so we'd need to copy and delete
            # For now, we'll just republish with the new slug
            from .tasks import publish_flipbook_task
            publish_flipbook_task.delay(project.id)
        
        serializer = self.get_serializer(project, context={'request': request})
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
        if settings.USE_S3:
            # Delete from S3
            from .storage import PublishedStorage
            storage = PublishedStorage()
            if project.published_slug:
                # List and delete all files with this prefix
                try:
                    # S3 doesn't have a simple "delete directory" - we need to list and delete
                    # For now, we'll just mark as unpublished. Files can be cleaned up later.
                    pass
                except Exception:
                    pass
        elif project.published_directory and os.path.exists(project.published_directory):
            shutil.rmtree(project.published_directory)
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)

