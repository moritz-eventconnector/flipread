# Investigation: S3 Presigned URLs Bug

## Bug Summary
The user reports that S3 presigned URLs are not working. This affects private media files (PDFs, page images) and potentially published flipbooks.

## Root Cause Analysis
Based on the code review of `apps/backend/projects/storage.py` and `apps/backend/config/settings.py`, several issues were identified:

1. **Manual URL Generation**: `MediaStorage` and `PublishedStorage` manually override the `url()` method to generate presigned URLs using `s3_client.generate_presigned_url`. This implementation is hacky, tries to manually initialize connections, and bypasses `django-storages`'s built-in mechanisms.
2. **Missing Signature Version**: S3-compatible providers (like SafeS3 mentioned in docs) often require **AWS Signature Version 4 (SigV4)**. This is not explicitly configured in `settings.py`, leading to potential "Signature Does Not Match" errors.
3. **Addressing Style**: Many S3 providers only support **path-style addressing** (e.g., `https://endpoint/bucket/key`), while `boto3` defaults to virtual-host style (`https://bucket.endpoint/key`). This is a common cause of failure for presigned URLs with non-AWS providers.
4. **Hardcoded Protocol in Fallback**: The fallback URL construction in `storage.py` (lines 142-150) hardcodes `https://`, which causes issues if the `endpoint_url` is `http://` (e.g., for local development with MinIO).
5. **Connection Initialization Issues**: The manual implementation tries to access `self.connection` in a way that might not be fully initialized with all settings from `django-storages`.

## Affected Components
- `apps/backend/projects/storage.py`: `MediaStorage` and `PublishedStorage` classes.
- `apps/backend/config/settings.py`: S3 configuration settings.

## Proposed Solution

1. **Simplify Storage Implementation**:
   - Use `django-storages` built-in support for presigned URLs by setting `querystring_auth = True` directly on the `MediaStorage` and `PublishedStorage` classes.
   - Remove the manual `url()` overrides and let `super().url()` handle the generation.
   - Set `querystring_expire` on the classes to maintain existing expiration times (1h for media, 24h for published).

2. **Improve S3 Configuration**:
   - Add `AWS_S3_SIGNATURE_VERSION = 's3v4'` to `settings.py` to ensure compatibility with modern S3 providers.
   - Add `AWS_S3_ADDRESSING_STYLE = 'path'` to `settings.py` to ensure compatibility with S3-compatible services.
   - Make sure `AWS_QUERYSTRING_AUTH` remains `False` globally (as it is now) but is overridden specifically for the storages that need it.

3. **Cleanup**:
   - Remove redundant connection initialization code in `storage.py`.
   - Ensure `custom_domain` is correctly handled (it should be `None` for private storages if presigned URLs should point to the S3 endpoint).

## Verification Plan
1. Create a regression test that mocks the S3 client and verifies that `storage.url()` returns a correctly signed URL with the expected host and parameters.
2. Verify that the generated URL respects the `AWS_S3_ENDPOINT_URL` and `AWS_S3_SIGNATURE_VERSION`.
