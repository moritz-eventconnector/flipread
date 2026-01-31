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
    
    # Set bucket_name as class attribute to ensure it's always set
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME.strip() if settings.AWS_STORAGE_BUCKET_NAME and settings.AWS_STORAGE_BUCKET_NAME.strip() else None
    
    @property
    def endpoint_url(self):
        """Return endpoint URL only if it's valid, otherwise None"""
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            return endpoint.strip()
        return None
    
    def __init__(self, *args, **kwargs):
        # Ensure bucket_name is set
        if not self.bucket_name:
            raise ValueError("AWS_STORAGE_BUCKET_NAME is not configured")
        
        # Remove endpoint_url from kwargs if it's empty to prevent passing it to parent
        if 'endpoint_url' in kwargs and not kwargs['endpoint_url']:
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
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
    
    # Set bucket_name as class attribute to ensure it's always set
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME.strip() if settings.AWS_STORAGE_BUCKET_NAME and settings.AWS_STORAGE_BUCKET_NAME.strip() else None
    
    @property
    def endpoint_url(self):
        """Return endpoint URL only if it's valid, otherwise None"""
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            return endpoint.strip()
        return None
    
    def url(self, name, parameters=None, expire=3600):
        """
        Generate presigned URL for private files.
        expire: URL expiration time in seconds (default: 1 hour)
        """
        # For private files, generate presigned URL
        if self.default_acl == 'private':
            try:
                # Get the S3 client
                s3_client = self.connection.meta.client
                
                # Use the parent's method to normalize the name (handles location prefix correctly)
                # But we need to get the actual key that was used when saving
                normalized_name = self._normalize_name(self._clean_name(name))
                
                # Generate presigned URL
                url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': self.bucket_name,
                        'Key': normalized_name
                    },
                    ExpiresIn=expire
                )
                return url
            except Exception as e:
                # Fallback to parent implementation if presigned URL generation fails
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to generate presigned URL for {name}: {e}", exc_info=True)
                return super().url(name, parameters)
        
        # For public files, use parent implementation
        return super().url(name, parameters)
    
    def __init__(self, *args, **kwargs):
        # Ensure bucket_name is set
        if not self.bucket_name:
            raise ValueError("AWS_STORAGE_BUCKET_NAME is not configured")
        
        # Remove endpoint_url from kwargs if it's empty to prevent passing it to parent
        if 'endpoint_url' in kwargs and not kwargs['endpoint_url']:
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
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN
    
    # Set bucket_name as class attribute to ensure it's always set
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME.strip() if settings.AWS_STORAGE_BUCKET_NAME and settings.AWS_STORAGE_BUCKET_NAME.strip() else None
    
    @property
    def endpoint_url(self):
        """Return endpoint URL only if it's valid, otherwise None"""
        endpoint = settings.AWS_S3_ENDPOINT_URL
        if endpoint and endpoint.strip():
            return endpoint.strip()
        return None
    
    def _save(self, name, content):
        """
        Override save to explicitly set ACL to public-read for all published files.
        This ensures files are publicly accessible even if bucket default is private.
        """
        # Call parent save method
        name = super()._save(name, content)
        
        # Explicitly set ACL to public-read after upload
        try:
            s3_client = self.connection.meta.client
            normalized_name = self._normalize_name(self._clean_name(name))
            
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
    
    def __init__(self, *args, **kwargs):
        # Ensure bucket_name is set
        if not self.bucket_name:
            raise ValueError("AWS_STORAGE_BUCKET_NAME is not configured")
        
        # Remove endpoint_url from kwargs if it's empty to prevent passing it to parent
        if 'endpoint_url' in kwargs and not kwargs['endpoint_url']:
            del kwargs['endpoint_url']
        super().__init__(*args, **kwargs)

