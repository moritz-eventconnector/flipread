from rest_framework import serializers
from .models import Project, ProjectPage


class ProjectPageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectPage
        fields = ('page_number', 'image_url', 'width', 'height')
    
    def get_image_url(self, obj):
        if obj.image_file:
            try:
                url = obj.image_file.url
                # If URL is already absolute (starts with http:// or https://), return it directly
                # This is the case for S3 presigned URLs
                if url.startswith('http://') or url.startswith('https://'):
                    return url
                # Otherwise, build absolute URI from request
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(url)
                # Fallback: return relative URL if no request context
                return url
            except Exception as e:
                # Log error but don't crash - return None if URL generation fails
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to generate image URL for page {obj.page_number}: {e}")
                return None
        return None


class ProjectSerializer(serializers.ModelSerializer):
    pages = ProjectPageSerializer(many=True, read_only=True)
    pdf_url = serializers.SerializerMethodField()
    can_download = serializers.ReadOnlyField()
    can_publish = serializers.ReadOnlyField()
    preview_url = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    pages_json = serializers.JSONField(read_only=True)
    
    class Meta:
        model = Project
        fields = (
            'id', 'title', 'slug', 'description', 'status', 'error_message',
            'total_pages', 'pdf_url', 'pages', 'pages_json', 'can_download', 'can_publish',
            'download_enabled', 'is_published', 'published_slug', 'published_logo',
            'preview_url', 'public_url',
            'created_at', 'updated_at', 'processing_started_at', 'processing_completed_at'
        )
        read_only_fields = (
            'id', 'slug', 'status', 'error_message', 'total_pages', 'pages_json',
            'can_download', 'can_publish', 'created_at', 'updated_at',
            'processing_started_at', 'processing_completed_at'
        )
    
    def validate_published_slug(self, value):
        """Validate published_slug"""
        if value:
            # Check if slug format is valid
            import re
            if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', value):
                raise serializers.ValidationError(
                    "Published URL darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten."
                )
            if len(value) < 3:
                raise serializers.ValidationError("Published URL muss mindestens 3 Zeichen lang sein.")
            if len(value) > 255:
                raise serializers.ValidationError("Published URL darf maximal 255 Zeichen lang sein.")
            
            # Check uniqueness (exclude current project)
            project = self.instance
            if project and Project.objects.filter(published_slug=value).exclude(id=project.id).exists():
                raise serializers.ValidationError("Diese URL ist bereits vergeben. Bitte wählen Sie eine andere.")
            elif not project and Project.objects.filter(published_slug=value).exists():
                raise serializers.ValidationError("Diese URL ist bereits vergeben. Bitte wählen Sie eine andere.")
        return value
    
    def get_pdf_url(self, obj):
        if obj.pdf_file:
            try:
                url = obj.pdf_file.url
                # If URL is already absolute (starts with http:// or https://), return it directly
                # This is the case for S3 presigned URLs
                if url.startswith('http://') or url.startswith('https://'):
                    return url
                # Otherwise, build absolute URI from request
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(url)
                # Fallback: return relative URL if no request context
                return url
            except Exception as e:
                # Log error but don't crash - return None if URL generation fails
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to generate PDF URL for project {obj.slug}: {e}")
                return None
        return None
    
    def get_preview_url(self, obj):
        if obj.status == Project.Status.READY:
            return f"/app/projects/{obj.slug}/preview"
        return None
    
    def get_public_url(self, obj):
        if obj.is_published and obj.published_slug:
            from django.conf import settings
            return f"{settings.SITE_URL}/public/{obj.published_slug}/"
        return None


class ProjectCreateSerializer(serializers.ModelSerializer):
    slug = serializers.CharField(read_only=True)  # Include slug in response
    
    class Meta:
        model = Project
        fields = ('title', 'description', 'pdf_file', 'slug')
    
    def validate_pdf_file(self, value):
        """Validate PDF file"""
        if value.size > 100 * 1024 * 1024:  # 100MB limit
            raise serializers.ValidationError("PDF file too large. Maximum size is 100MB.")
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError("File must be a PDF.")
        return value
    
    def validate_title(self, value):
        """Validate title"""
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters long.")
        if len(value) > 255:
            raise serializers.ValidationError("Title must be less than 255 characters.")
        return value
    
    def create(self, validated_data):
        # Set user before creating instance to ensure project_upload_path can access it
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data['status'] = Project.Status.UPLOADING
        
        # Store user_id on instance for project_upload_path fallback
        # This ensures the upload path can be generated even if Django calls it before full save
        instance = Project(**validated_data)
        instance._user_id = user.id
        
        # Now save the instance (this will trigger project_upload_path and slug generation in save() method)
        instance.save()
        
        # Refresh from database to ensure slug is available in the response
        instance.refresh_from_db()
        return instance

