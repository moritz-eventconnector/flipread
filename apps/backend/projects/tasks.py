"""
Celery tasks for PDF processing
"""
import os
import json
import subprocess
from celery import shared_task
from django.conf import settings
from django.utils import timezone
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
        pdf_path = project.pdf_file.path
        output_prefix = os.path.join(pages_dir, 'page')
        
        # Run pdftoppm
        result = subprocess.run(
            ['pdftoppm', '-jpeg', '-r', '150', pdf_path, output_prefix],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise Exception(f"pdftoppm failed: {result.stderr}")
        
        # Find generated images
        page_files = sorted([f for f in os.listdir(pages_dir) if f.endswith('.jpg')])
        total_pages = len(page_files)
        
        if total_pages == 0:
            raise Exception("No pages generated")
        
        # Create ProjectPage objects and collect metadata
        pages_data = []
        for idx, page_file in enumerate(page_files, start=1):
            page_path = os.path.join(pages_dir, page_file)
            
            # Get image dimensions
            with Image.open(page_path) as img:
                width, height = img.size
            
            # Create ProjectPage
            page = ProjectPage.objects.create(
                project=project,
                page_number=idx,
                image_file=f'projects/{project.user.id}/{project.id}/pages/{page_file}',
                width=width,
                height=height
            )
            
            pages_data.append({
                'page_number': idx,
                'file': page_file,
                'width': width,
                'height': height
            })
        
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
    """Publish flipbook to public directory"""
    try:
        project = Project.objects.get(id=project_id)
        
        if not project.published_slug:
            project.save()  # This will generate published_slug
        
        published_dir = project.published_directory
        os.makedirs(published_dir, exist_ok=True)
        
        # Copy pages
        pages_dir = os.path.join(published_dir, 'pages')
        os.makedirs(pages_dir, exist_ok=True)
        
        for page in project.pages.all().order_by('page_number'):
            if page.image_file and os.path.exists(page.image_file.path):
                dest_path = os.path.join(pages_dir, f"page-{page.page_number:03d}.jpg")
                import shutil
                shutil.copy2(page.image_file.path, dest_path)
        
        # Create pages.json
        pages_json_path = os.path.join(published_dir, 'pages.json')
        with open(pages_json_path, 'w') as f:
            json.dump(project.pages_json, f, indent=2)
        
        # Copy viewer files (from backend static or create inline)
        # Create index.html
        index_html = f"""<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project.title} - Flipbook</title>
    <link rel="stylesheet" href="app.css">
</head>
<body>
    <div id="flipbook-container"></div>
    <div id="page-info" class="page-info"></div>
    <script src="/lib/st-pageflip.min.js"></script>
    <script src="app.js"></script>
</body>
</html>"""
        
        with open(os.path.join(published_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(index_html)
        
        # Copy app.js and app.css from viewer source if exists
        viewer_source = os.path.join(settings.BASE_DIR.parent.parent, 'apps', 'frontend', 'public', 'viewer')
        if os.path.exists(viewer_source):
            import shutil
            for file in ['app.js', 'app.css']:
                src = os.path.join(viewer_source, file)
                dst = os.path.join(published_dir, file)
                if os.path.exists(src):
                    shutil.copy2(src, dst)
        
        return f"Published project {project.id} to {published_dir}"
    
    except Project.DoesNotExist:
        return f"Project {project_id} not found"
    except Exception as e:
        raise
