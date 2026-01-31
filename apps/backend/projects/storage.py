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
    
    def url(self, name, parameters=None, expire=3600):
        """
        Generate presigned URL for private files.
        expire: URL expiration time in seconds (default: 1 hour)
        """
        # For private files, generate presigned URL
        if self.default_acl == 'private':
            try:
                # Ensure connection is initialized
                if not hasattr(self, 'connection') or self.connection is None:
                    # Force connection initialization
                    _ = self.bucket_name
                
                # Get the S3 client
                s3_client = self.connection.meta.client
                
                # Use the parent's method to normalize the name (handles location prefix correctly)
                # The name parameter is the relative path stored in the database
                normalized_name = self._normalize_name(self._clean_name(name))
                
                # Log for debugging (can be removed in production)
                import logging
                logger = logging.getLogger(__name__)
                logger.debug(f"Generating presigned URL for: name={name}, normalized={normalized_name}, bucket={self.bucket_name}")
                
                # Generate presigned URL
                url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': self.bucket_name,
                        'Key': normalized_name
                    },
                    ExpiresIn=expire
                )
                
                logger.debug(f"Generated presigned URL: {url[:100]}...")
                return url
            except Exception as e:
                # Fallback to parent implementation if presigned URL generation fails
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to generate presigned URL for {name}: {e}", exc_info=True)
                # Try parent implementation, but it will likely also fail for private files
                try:
                    return super().url(name, parameters)
                except Exception as e2:
                    logger.error(f"Parent url() also failed: {e2}")
                    # Return a placeholder or raise
                    raise ValueError(f"Cannot generate URL for {name}: {e}")
        
        # For public files, use parent implementation
        return super().url(name, parameters)


class PublishedStorage(S3Boto3Storage):
    """Storage for published flipbooks (public)
    
    Files are stored with structure: customer-{user_id}-projekt-{published_slug}/...
    All files uploaded here are set to public-read ACL explicitly.
    """
    location = ''  # No prefix, files already have full path
    default_acl = 'public-read'  # Published files should be public
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
    
    def url(self, name, parameters=None, expire=86400):
        """
        Generate presigned URL for published files.
        Using presigned URLs ensures access even if bucket policy doesn't allow public reads.
        expire: URL expiration time in seconds (default: 24 hours for published content)
        """
        try:
            # Ensure connection is initialized
            if not hasattr(self, 'connection') or self.connection is None:
                # Force connection initialization
                _ = self.bucket_name
            
            # Get the S3 client
            s3_client = self.connection.meta.client
            
            # Use the parent's method to normalize the name (handles location prefix correctly)
            normalized_name = self._normalize_name(self._clean_name(name))
            
            # Log for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Generating presigned URL for published file: name={name}, normalized={normalized_name}")
            
            # Generate presigned URL
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': normalized_name
                },
                ExpiresIn=expire
            )
            
            logger.debug(f"Generated presigned URL for published file: {url[:100]}...")
            return url
        except Exception as e:
            # Fallback to parent implementation if presigned URL generation fails
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to generate presigned URL for published file {name}: {e}", exc_info=True)
            # Try parent implementation as fallback
            try:
                return super().url(name, parameters)
            except Exception as e2:
                logger.error(f"Parent url() also failed: {e2}")
                raise ValueError(f"Cannot generate URL for {name}: {e}")
    
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

