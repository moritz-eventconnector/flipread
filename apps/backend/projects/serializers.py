from rest_framework import serializers
from .models import Project, ProjectPage


class ProjectPageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ProjectPage
        fields = ('page_number', 'image_url', 'width', 'height')
    
    def get_image_url(self, obj):
        request = self.context.get('request')
        if obj.image_file and request:
            return request.build_absolute_uri(obj.image_file.url)
        return None


class ProjectSerializer(serializers.ModelSerializer):
    pages = ProjectPageSerializer(many=True, read_only=True)
    pdf_url = serializers.SerializerMethodField()
    can_download = serializers.ReadOnlyField()
    can_publish = serializers.ReadOnlyField()
    preview_url = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = (
            'id', 'title', 'slug', 'description', 'status', 'error_message',
            'total_pages', 'pdf_url', 'pages', 'can_download', 'can_publish',
            'download_enabled', 'is_published', 'published_slug',
            'preview_url', 'public_url',
            'created_at', 'updated_at', 'processing_started_at', 'processing_completed_at'
        )
        read_only_fields = (
            'id', 'slug', 'status', 'error_message', 'total_pages',
            'can_download', 'can_publish', 'created_at', 'updated_at',
            'processing_started_at', 'processing_completed_at'
        )
    
    def get_pdf_url(self, obj):
        request = self.context.get('request')
        if obj.pdf_file and request:
            return request.build_absolute_uri(obj.pdf_file.url)
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
    class Meta:
        model = Project
        fields = ('title', 'description', 'pdf_file')
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = Project.Status.UPLOADING
        return super().create(validated_data)

