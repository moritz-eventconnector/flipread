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
import logging

from .models import Project, ProjectPage
from .serializers import ProjectSerializer, ProjectCreateSerializer
from .tasks import process_pdf_task

logger = logging.getLogger(__name__)


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
        """Download flipbook as ZIP (requires payment) - Standalone version for any webserver"""
        project = self.get_object()
        
        logger.info(f"Download request for project {project.slug} by user {request.user.email}")
        
        if project.user != request.user and not request.user.is_admin:
            logger.warning(f"Permission denied: User {request.user.email} tried to download project {project.slug} owned by {project.user.email}")
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not project.can_download():
            logger.warning(f"Download not available for project {project.slug}: download_enabled={project.download_enabled}")
            return Response(
                {'error': 'Download not available. Payment required.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        try:
            # Create ZIP in memory
            zip_buffer = io.BytesIO()
            pages_added = 0
            
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
                                    logger.warning(f"Page {page.page_number} file not found: {page.image_file.path}")
                                    continue
                            
                            arcname = f"pages/page-{page.page_number:03d}.jpg"
                            zipf.writestr(arcname, image_content)
                            pages_added += 1
                        except Exception as e:
                            logger.error(f"Error adding page {page.page_number} to ZIP: {str(e)}", exc_info=True)
                            continue
            
                # Add pages.json
                if project.pages_json:
                    import json
                    zipf.writestr('pages.json', json.dumps(project.pages_json, indent=2))
                    logger.info(f"Added pages.json to ZIP for project {project.slug}")
                else:
                    logger.warning(f"No pages_json found for project {project.slug}")
                
                # Add page-flip library if available
                lib_path = os.path.join(settings.BASE_DIR.parent.parent, 'apps', 'frontend', 'public', 'lib', 'page-flip.browser.js')
                if os.path.exists(lib_path):
                    with open(lib_path, 'rb') as f:
                        zipf.writestr('lib/page-flip.browser.js', f.read())
                    logger.info(f"Added page-flip library to ZIP from {lib_path}")
                else:
                    # Try alternative path
                    alt_lib_path = os.path.join(settings.BASE_DIR.parent.parent, 'apps', 'frontend', 'public', 'lib', 'page-flip.browser.min.js')
                    if os.path.exists(alt_lib_path):
                        with open(alt_lib_path, 'rb') as f:
                            zipf.writestr('lib/page-flip.browser.js', f.read())
                        logger.info(f"Added page-flip library to ZIP from {alt_lib_path}")
                    else:
                        logger.warning(f"Page-flip library not found at {lib_path} or {alt_lib_path} - ZIP will not include library")
                
                # Create standalone index.html with embedded viewer
                index_html = self._create_standalone_html(project)
                zipf.writestr('index.html', index_html.encode('utf-8'))
                logger.info(f"Created standalone index.html for project {project.slug}")
            
            logger.info(f"Successfully created ZIP for project {project.slug} with {pages_added} pages")
            
            # Return ZIP file
            zip_buffer.seek(0)
            response = FileResponse(
                zip_buffer,
                as_attachment=True,
                filename=f"{project.slug}.zip"
            )
            response['Content-Type'] = 'application/zip'
            return response
            
        except Exception as e:
            logger.error(f"Error creating ZIP for project {project.slug}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Fehler beim Erstellen der ZIP-Datei: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _create_standalone_html(self, project):
        """Create standalone HTML with embedded viewer for download"""
        import json
        
        # Get pages data for the viewer
        pages_data = project.pages_json or {}
        pages_list = pages_data.get('pages', [])
        
        # Create pages array for JavaScript
        pages_list_js = []
        for i, page in enumerate(pages_list):
            # Get filename from page data or generate default
            page_file = page.get("file")
            if not page_file:
                page_number = page.get("page_number", i + 1)
                page_file = f"page-{page_number:03d}.jpg"
            pages_list_js.append({
                'src': f'./pages/{page_file}',
                'width': page.get('width', 800),
                'height': page.get('height', 600),
            })
        pages_js = json.dumps(pages_list_js)
        
        # Standalone HTML with embedded viewer - uses local lib/page-flip.browser.js
        html = f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project.title} - Flipbook</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }}
        #flipbook-container {{
            width: 100%;
            max-width: 1200px;
            height: 100%;
            min-height: 600px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            border-radius: 8px;
            overflow: hidden;
            background: white;
        }}
        .page-info {{
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1000;
            backdrop-filter: blur(10px);
        }}
        .error {{
            text-align: center;
            padding: 40px;
            color: #d32f2f;
            font-size: 18px;
        }}
        @media (max-width: 768px) {{
            #flipbook-container {{
                min-height: 400px;
            }}
            body {{
                padding: 10px;
            }}
        }}
    </style>
</head>
<body>
    <div id="flipbook-container"></div>
    <div id="page-info" class="page-info">Lädt...</div>
    
    <script src="./lib/page-flip.browser.js"></script>
    <script>
        (function() {{
            'use strict';
            
            const pages = {pages_js};
            const totalPages = {pages_data.get('total_pages', len(pages_list))};
            let currentPage = 1;
            let flipbook = null;
            
            // Get page from URL
            const urlParams = new URLSearchParams(window.location.search);
            currentPage = parseInt(urlParams.get('page') || '1', 10);
            if (currentPage < 1) currentPage = 1;
            if (currentPage > totalPages) currentPage = totalPages;
            
            // Initialize flipbook
            function initFlipbook() {{
                const container = document.getElementById('flipbook-container');
                
                if (!container || pages.length === 0) {{
                    container.innerHTML = '<div class="error">Fehler beim Laden des Flipbooks</div>';
                    return;
                }}
                
                // Wait for page-flip library to load
                if (typeof St === 'undefined' || typeof St.PageFlip === 'undefined') {{
                    setTimeout(initFlipbook, 100);
                    return;
                }}
                
                // Calculate dimensions based on first page
                const firstPage = pages[0];
                const aspectRatio = firstPage.width / firstPage.height;
                const maxWidth = Math.min(1000, window.innerWidth - 40);
                const width = maxWidth;
                const height = Math.round(width / aspectRatio);
                
                // Create flipbook instance
                flipbook = new St.PageFlip(container, {{
                    width: width,
                    height: height,
                    showCover: true,
                    maxShadowOpacity: 0.5,
                    flippingTime: 1000,
                    usePortrait: aspectRatio < 1,
                    startPage: currentPage - 1,
                }});
                
                // Load pages
                flipbook.loadFromImages(pages.map(p => p.src));
                
                // Update page info
                function updatePageInfo(page) {{
                    const pageInfo = document.getElementById('page-info');
                    if (pageInfo) {{
                        pageInfo.textContent = `Seite ${{page}} von ${{totalPages}}`;
                    }}
                }}
                
                updatePageInfo(currentPage);
                
                // Handle page flip
                flipbook.on('flip', (e) => {{
                    currentPage = e.data + 1;
                    updatePageInfo(currentPage);
                    
                    // Update URL without reload
                    const url = new URL(window.location.href);
                    url.searchParams.set('page', currentPage.toString());
                    window.history.pushState({{}}, '', url.toString());
                }});
                
                // Keyboard navigation
                window.addEventListener('keydown', (e) => {{
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {{
                        e.preventDefault();
                        flipbook.flipPrev();
                    }} else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {{
                        e.preventDefault();
                        flipbook.flipNext();
                    }}
                }});
                
                // Handle browser back/forward
                window.addEventListener('popstate', () => {{
                    const urlParams = new URLSearchParams(window.location.search);
                    const page = parseInt(urlParams.get('page') || '1', 10);
                    if (page !== currentPage && page >= 1 && page <= totalPages) {{
                        currentPage = page;
                        flipbook.flip(currentPage - 1);
                        updatePageInfo(currentPage);
                    }}
                }});
            }}
            
            // Initialize on load
            if (document.readyState === 'loading') {{
                document.addEventListener('DOMContentLoaded', initFlipbook);
            }} else {{
                initFlipbook();
            }}
        }})();
    </script>
</body>
</html>"""
        return html
    
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

