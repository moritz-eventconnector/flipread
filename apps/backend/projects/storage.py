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
    
    def __init__(self, *args, **kwargs):
        # Set bucket_name from settings
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        if not bucket_name or not bucket_name.strip():
            raise ValueError("AWS_STORAGE_BUCKET_NAME is not configured")
        kwargs['bucket_name'] = bucket_name.strip()
        
        # Set endpoint_url only if it's valid
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            kwargs['endpoint_url'] = endpoint.strip()
        elif 'endpoint_url' in kwargs:
            # Remove empty endpoint_url from kwargs
            del kwargs['endpoint_url']
        
        super().__init__(*args, **kwargs)


class MediaStorage(S3Boto3Storage):
    """Storage for media files (PDFs, page images)
    
    Files are stored with structure: customer-{user_id}-projekt-{project_id}/...
    Uses presigned URLs for private files to allow temporary access.
    """
    location = ''  # No prefix, files already have full path from upload_to
    default_acl = 'private'  # Media files should be private
    file_overwrite = False
    custom_domain = None  # Don't use custom domain for private media to ensure presigned URLs work
    querystring_auth = True
    querystring_expire = 3600
    
    def __init__(self, *args, **kwargs):
        # Set bucket_name from settings
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        if not bucket_name or not bucket_name.strip():
            raise ValueError("AWS_STORAGE_BUCKET_NAME is not configured")
        kwargs['bucket_name'] = bucket_name.strip()
        
        # Set endpoint_url only if it's valid
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            kwargs['endpoint_url'] = endpoint.strip()
        elif 'endpoint_url' in kwargs:
            # Remove empty endpoint_url from kwargs
            del kwargs['endpoint_url']
        
        super().__init__(*args, **kwargs)


class PublishedStorage(S3Boto3Storage):
    """Storage for published flipbooks (public)
    
    Files are stored with structure: customer-{user_id}-projekt-{published_slug}/...
    All files uploaded here are set to public-read ACL explicitly.
    """
    location = ''  # No prefix, files already have full path
    default_acl = 'public-read'  # Published files should be public
    file_overwrite = False
    custom_domain = None  # Use direct S3 URL for presigned URLs
    querystring_auth = True
    querystring_expire = 86400  # 24 hours for published content
    
    def __init__(self, *args, **kwargs):
        # Set bucket_name from settings
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        if not bucket_name or not bucket_name.strip():
            raise ValueError("AWS_STORAGE_BUCKET_NAME is not configured")
        kwargs['bucket_name'] = bucket_name.strip()
        
        # Set endpoint_url only if it's valid
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            kwargs['endpoint_url'] = endpoint.strip()
        elif 'endpoint_url' in kwargs:
            # Remove empty endpoint_url from kwargs
            del kwargs['endpoint_url']
        
        super().__init__(*args, **kwargs)
    
    def _save(self, name, content):
        """
        Override save to explicitly set ACL to public-read for all published files.
        This ensures files are publicly accessible even if bucket default is private.
        """
        # Call parent save method
        name = super()._save(name, content)
        
        # Explicitly set ACL to public-read after upload
        try:
            # Ensure connection is initialized
            if not hasattr(self, 'connection') or self.connection is None:
                # Force connection initialization
                _ = self.bucket_name
            
            s3_client = self.connection.meta.client
            # Normalize the name (handles location prefix correctly)
            normalized_name = name.replace('\\', '/').strip('/')
            
            # Add location prefix if it exists
            if hasattr(self, 'location') and self.location:
                location = self.location.strip('/')
                if location:
                    normalized_name = f"{location}/{normalized_name}".strip('/')
            
            # Set ACL to public-read
            s3_client.put_object_acl(
                Bucket=self.bucket_name,
                Key=normalized_name,
                ACL='public-read'
            )
        except Exception as e:
            # Log warning but don't fail - file is uploaded, just ACL might not be set
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to set public-read ACL for {name}: {e}", exc_info=True)
        
        return name

