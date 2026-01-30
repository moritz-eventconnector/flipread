"""
Custom storage backends for S3-compatible storage (AWS S3, SafeS3, etc.)
"""
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class MediaStorage(S3Boto3Storage):
    """Storage for media files (PDFs, page images)
    
    Files are stored with structure: customer-{user_id}-projekt-{project_id}/...
    """
    location = ''  # No prefix, files already have full path from upload_to
    default_acl = 'private'  # Media files should be private
    file_overwrite = False
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set endpoint URL for S3-compatible services (e.g. SafeS3)
        if settings.AWS_S3_ENDPOINT_URL:
            self.endpoint_url = settings.AWS_S3_ENDPOINT_URL


class PublishedStorage(S3Boto3Storage):
    """Storage for published flipbooks (public)
    
    Files are stored with structure: customer-{user_id}-projekt-{published_slug}/...
    """
    location = ''  # No prefix, files already have full path
    default_acl = 'public-read'  # Published files should be public
    file_overwrite = False
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Set endpoint URL for S3-compatible services (e.g. SafeS3)
        if settings.AWS_S3_ENDPOINT_URL:
            self.endpoint_url = settings.AWS_S3_ENDPOINT_URL

