"""
Custom storage backends for S3-compatible storage (AWS S3, SafeS3, etc.)
"""
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class StaticFilesStorage(S3Boto3Storage):
    """Storage for static files (CSS, JavaScript, Images)
    
    Only sets endpoint_url if AWS_S3_ENDPOINT_URL is provided and not empty.
    """
    location = 'static'
    default_acl = 'public-read'
    file_overwrite = False
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
    
    @property
    def endpoint_url(self):
        """Return endpoint URL only if it's valid, otherwise None"""
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            return endpoint.strip()
        return None
    
    def __init__(self, *args, **kwargs):
        # Remove endpoint_url from kwargs if it's empty to prevent passing it to parent
        if 'endpoint_url' in kwargs and not kwargs['endpoint_url']:
            del kwargs['endpoint_url']
        super().__init__(*args, **kwargs)


class MediaStorage(S3Boto3Storage):
    """Storage for media files (PDFs, page images)
    
    Files are stored with structure: customer-{user_id}-projekt-{project_id}/...
    """
    location = ''  # No prefix, files already have full path from upload_to
    default_acl = 'private'  # Media files should be private
    file_overwrite = False
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
    
    @property
    def endpoint_url(self):
        """Return endpoint URL only if it's valid, otherwise None"""
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            return endpoint.strip()
        return None
    
    def __init__(self, *args, **kwargs):
        # Remove endpoint_url from kwargs if it's empty to prevent passing it to parent
        if 'endpoint_url' in kwargs and not kwargs['endpoint_url']:
            del kwargs['endpoint_url']
        super().__init__(*args, **kwargs)


class PublishedStorage(S3Boto3Storage):
    """Storage for published flipbooks (public)
    
    Files are stored with structure: customer-{user_id}-projekt-{published_slug}/...
    """
    location = ''  # No prefix, files already have full path
    default_acl = 'public-read'  # Published files should be public
    file_overwrite = False
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
    
    @property
    def endpoint_url(self):
        """Return endpoint URL only if it's valid, otherwise None"""
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            return endpoint.strip()
        return None
    
    def __init__(self, *args, **kwargs):
        # Remove endpoint_url from kwargs if it's empty to prevent passing it to parent
        if 'endpoint_url' in kwargs and not kwargs['endpoint_url']:
            del kwargs['endpoint_url']
        super().__init__(*args, **kwargs)

