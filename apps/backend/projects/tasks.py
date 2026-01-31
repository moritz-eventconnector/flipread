"""
Celery tasks for PDF processing
"""
import os
import json
import subprocess
import tempfile
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.files.base import ContentFile
from PIL import Image
from .models import Project, ProjectPage


@shared_task
def process_pdf_task(project_id):
    """Process PDF into images"""
    try:
        project = Project.objects.get(id=project_id)
        project.status = Project.Status.PROCESSING
        project.processing_started_at = timezone.now()
        project.save()
        
        # Create pages directory
        pages_dir = project.pages_directory
        os.makedirs(pages_dir, exist_ok=True)
        
        # Convert PDF to images using pdftoppm
        # Always use S3-compatible method (read from storage)
        pdf_content = project.pdf_file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_pdf:
            tmp_pdf.write(pdf_content)
            pdf_path = tmp_pdf.name
        
        output_prefix = os.path.join(pages_dir, 'pdf-page')
        
        # Run pdftoppm
        result = subprocess.run(
            ['pdftoppm', '-jpeg', '-r', '150', pdf_path, output_prefix],
            capture_output=True,
            text=True
        )
        
        # Clean up temp PDF file
        if os.path.exists(pdf_path):
            try:
                os.unlink(pdf_path)
            except:
                pass
        
        if result.returncode != 0:
            raise Exception(f"pdftoppm failed: {result.stderr}")
        
        # Find generated images (from pdftoppm)
        # pdftoppm creates files like: pdf-page-001.jpg, pdf-page-002.jpg, etc.
        page_files = sorted([f for f in os.listdir(pages_dir) if f.startswith('pdf-page') and f.endswith('.jpg')])
        
        # If no files with 'pdf-page' prefix, try 'page' prefix (fallback)
        if not page_files:
            page_files = sorted([f for f in os.listdir(pages_dir) if f.startswith('page') and f.endswith('.jpg')])
        pdf_page_count = len(page_files)
        
        if pdf_page_count == 0:
            raise Exception("No pages generated")
        
        # Analyze pages to detect landscape orientation and split if needed
        # Strategy:
        # 1. First page (cover) is always treated as one page, even if landscape
        # 2. Pages 2+ that are landscape (width > height) are split into 2 pages (left and right)
        
        pages_data = []
        flipbook_page_number = 1
        
        for pdf_page_idx, page_file in enumerate(page_files, start=1):
            page_path = os.path.join(pages_dir, page_file)
            
            # Get image dimensions
            with Image.open(page_path) as img:
                width, height = img.size
                aspect_ratio = width / height if height > 0 else 1
            
            is_cover = (pdf_page_idx == 1)
            is_landscape = aspect_ratio > 1.2  # Threshold: width is 20% larger than height
            
            if is_cover:
                # Cover is always one page, even if landscape
                # Upload as single page (always use S3-compatible storage)
                with open(page_path, 'rb') as f:
                    file_content = f.read()
                    project_page = ProjectPage(
                        project=project,
                        page_number=flipbook_page_number,
                        width=width,
                        height=height
                    )
                    project_page.image_file.save(f'page-{flipbook_page_number:03d}.jpg', ContentFile(file_content), save=False)
                    project_page.save()
                
                pages_data.append({
                    'page_number': flipbook_page_number,
                    'file': f'page-{flipbook_page_number:03d}.jpg',
                    'width': width,
                    'height': height
                })
                flipbook_page_number += 1
                
            elif is_landscape:
                # Landscape pages (except cover) are split into 2 pages
                # Left half and right half
                with Image.open(page_path) as img:
                    # Split into left and right halves
                    left_half = img.crop((0, 0, width // 2, height))
                    right_half = img.crop((width // 2, 0, width, height))
                    
                    # Save left half
                    left_filename = f'page-{flipbook_page_number:03d}.jpg'
                    left_path = os.path.join(pages_dir, left_filename)
                    left_half.save(left_path, 'JPEG', quality=95)
                    
                    # Save right half
                    right_filename = f'page-{flipbook_page_number + 1:03d}.jpg'
                    right_path = os.path.join(pages_dir, right_filename)
                    right_half.save(right_path, 'JPEG', quality=95)
                
                # Upload left half (always use S3-compatible storage)
                left_width = width // 2
                left_height = height
                with open(left_path, 'rb') as f:
                    file_content = f.read()
                    project_page = ProjectPage(
                        project=project,
                        page_number=flipbook_page_number,
                        width=left_width,
                        height=left_height
                    )
                    project_page.image_file.save(left_filename, ContentFile(file_content), save=False)
                    project_page.save()
                
                pages_data.append({
                    'page_number': flipbook_page_number,
                    'file': left_filename,
                    'width': left_width,
                    'height': left_height
                })
                flipbook_page_number += 1
                
                # Upload right half (always use S3-compatible storage)
                right_width = width - (width // 2)
                right_height = height
                with open(right_path, 'rb') as f:
                    file_content = f.read()
                    project_page = ProjectPage(
                        project=project,
                        page_number=flipbook_page_number,
                        width=right_width,
                        height=right_height
                    )
                    project_page.image_file.save(right_filename, ContentFile(file_content), save=False)
                    project_page.save()
                
                pages_data.append({
                    'page_number': flipbook_page_number,
                    'file': right_filename,
                    'width': right_width,
                    'height': right_height
                })
                flipbook_page_number += 1
                
            else:
                # Portrait page - use as is (always use S3-compatible storage)
                with open(page_path, 'rb') as f:
                    file_content = f.read()
                    project_page = ProjectPage(
                        project=project,
                        page_number=flipbook_page_number,
                        width=width,
                        height=height
                    )
                    project_page.image_file.save(f'page-{flipbook_page_number:03d}.jpg', ContentFile(file_content), save=False)
                    project_page.save()
                
                pages_data.append({
                    'page_number': flipbook_page_number,
                    'file': f'page-{flipbook_page_number:03d}.jpg',
                    'width': width,
                    'height': height
                })
                flipbook_page_number += 1
        
        # Total pages is now the flipbook page count (may be more than PDF pages if landscape pages were split)
        total_pages = flipbook_page_number - 1
        
        # Clean up original PDF page files (they've been renamed or split)
        for page_file in page_files:
            original_path = os.path.join(pages_dir, page_file)
            if os.path.exists(original_path):
                # Delete original PDF page files (pdftoppm output)
                # These have been processed and renamed/split in the loop above
                try:
                    os.remove(original_path)
                except:
                    pass
        
        # Update project
        project.total_pages = total_pages
        project.pages_json = {
            'total_pages': total_pages,
            'pages': pages_data
        }
        project.status = Project.Status.READY
        project.processing_completed_at = timezone.now()
        project.save()
        
        return f"Processed {total_pages} pages for project {project.id}"
    
    except Project.DoesNotExist:
        return f"Project {project_id} not found"
    except Exception as e:
        try:
            project = Project.objects.get(id=project_id)
            project.status = Project.Status.ERROR
            project.error_message = str(e)
            project.save()
        except:
            pass
        raise


@shared_task
def publish_flipbook_task(project_id):
    """Publish flipbook to public directory (local or S3)"""
    try:
        project = Project.objects.get(id=project_id)
        
        if not project.published_slug:
            project.save()  # This will generate published_slug
        
        # Always publish to S3
        from .storage import PublishedStorage
        storage = PublishedStorage()
        
        # Base path for published files
        base_path = f"customer-{project.user.id}-projekt-{project.published_slug}"
        
        # Upload pages
        for page in project.pages.all().order_by('page_number'):
            if page.image_file:
                # Read image file (always use S3-compatible method)
                image_content = page.image_file.read()
                
                # Upload to S3
                s3_path = f"{base_path}/pages/page-{page.page_number:03d}.jpg"
                storage.save(s3_path, ContentFile(image_content))
        
        # Upload pages.json
        pages_json_content = json.dumps(project.pages_json, indent=2).encode('utf-8')
        storage.save(f"{base_path}/pages.json", ContentFile(pages_json_content))
        
        # Create and upload index.html
        logo_html = ''
        if project.published_logo:
            logo_url = project.published_logo.url if hasattr(project.published_logo, 'url') else f'/media/{project.published_logo}'
            logo_html = f'<div id="logo-container" style="position: fixed; top: 20px; left: 20px; z-index: 1000;"><img src="{logo_url}" alt="Logo" style="max-height: 60px; max-width: 200px; object-fit: contain;"></div>'
        
        index_html = f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project.title} - Flipbook</title>
    <link rel="stylesheet" href="app.css">
</head>
<body>
    {logo_html}
    <div id="flipbook-container"></div>
    <div id="page-info" class="page-info"></div>
    <script src="/lib/page-flip.browser.js"></script>
    <script src="app.js"></script>
</body>
</html>"""
        storage.save(f"{base_path}/index.html", ContentFile(index_html.encode('utf-8')))
        
        # Upload app.js and app.css from viewer source if exists
        viewer_source = os.path.join(settings.BASE_DIR.parent.parent, 'apps', 'frontend', 'public', 'viewer')
        for file in ['app.js', 'app.css']:
            src = os.path.join(viewer_source, file)
            if os.path.exists(src):
                with open(src, 'rb') as f:
                    storage.save(f"{base_path}/{file}", ContentFile(f.read()))
        
        return f"Published project {project.id} to S3: {project.published_slug}"
    
    except Project.DoesNotExist:
        return f"Project {project_id} not found"
    except Exception as e:
        raise
