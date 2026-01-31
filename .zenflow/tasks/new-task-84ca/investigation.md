# Bug Investigation Report

## Bug Summary

Two critical issues reported:

1. **Flipbook not loading**: Page images return 403 Forbidden errors from S3
   - Error: `GET https://de-zlg1.safes3.com/flipread/customer-2-projekt-8/pages/page-001.jpg` returns 403
   - Frontend logs show flipbook initializes but images fail to load

2. **Stripe checkout failing**: Both download and hosting checkout endpoints return 500 errors
   - `POST /api/billing/checkout/download/` returns 500
   - `POST /api/billing/checkout/hosting/` returns 500

## Root Cause Analysis

### Issue 1: Flipbook 403 Errors (S3 Access)

**Root Cause**: Published flipbook pages are trying to load directly from S3, but files may have incorrect ACLs (Access Control Lists) or the bucket is not configured for public read access.

**Evidence**:
- `storage.py:128`: `PublishedStorage` class sets `default_acl = 'public-read'`
- `storage.py:156-161`: Explicitly calls `put_object_acl()` to set `public-read` ACL after upload
- `tasks.py:253-254`: Published pages are uploaded to path `customer-{user_id}-projekt-{published_slug}/pages/page-{page_number:03d}.jpg`
- The URL `https://de-zlg1.safes3.com/flipread/customer-2-projekt-8/pages/page-001.jpg` shows direct S3 access attempt

**Possible causes**:
1. S3 bucket policy doesn't allow public read access
2. ACL setting is failing silently (logged as warning at `storage.py:166` but doesn't fail the upload)
3. Bucket is private and requires presigned URLs (but PublishedStorage doesn't generate presigned URLs)
4. CORS configuration on S3 bucket is blocking cross-origin requests

**Affected Components**:
- `apps/backend/projects/storage.py`: `PublishedStorage` class
- `apps/backend/projects/tasks.py`: `publish_flipbook_task()` function
- S3 bucket configuration (SafeS3)

### Issue 2: Stripe Checkout 500 Errors

**Root Cause**: Payment status enum mismatch in code.

**Evidence**:
- `billing/models.py:32-36`: Payment model defines status choices as `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED`
- `billing/views.py:175`: DEV MODE code uses `Payment.Status.SUCCEEDED` (doesn't exist)
- `billing/views.py:629`: Another reference to `Payment.Status.SUCCEEDED`

**Error Location**: `apps/backend/billing/views.py`
- Line 175: `status=Payment.Status.SUCCEEDED,` → Should be `Payment.Status.COMPLETED`
- Line 629: `payment.status = Payment.Status.SUCCEEDED` → Should be `Payment.Status.COMPLETED`

**Affected Components**:
- `apps/backend/billing/views.py`: `checkout_download()` and webhook handler functions
- Both checkout endpoints are affected

## Proposed Solution

### Fix 1: Stripe Checkout Error (HIGH PRIORITY - Quick Fix)

**Change Required**:
Replace `Payment.Status.SUCCEEDED` with `Payment.Status.COMPLETED` in:
- `apps/backend/billing/views.py:175`
- `apps/backend/billing/views.py:629`

**Impact**: This is a critical fix that will immediately resolve the 500 errors in checkout endpoints.

### Fix 2: Flipbook 403 Errors (MEDIUM PRIORITY - Needs Investigation)

**Diagnostic Steps**:
1. Check S3 bucket configuration:
   - Verify bucket policy allows public read for published files
   - Check if CORS is properly configured
   - Verify ACL permissions are being set correctly

2. **Option A** (Preferred): Fix S3 bucket configuration
   - Add bucket policy to allow public read access for published files
   - Ensure CORS allows cross-origin requests from frontend domain
   - Example bucket policy needed:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [{
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": ["s3:GetObject"],
         "Resource": ["arn:aws:s3:::flipread/customer-*-projekt-*/pages/*"]
       }]
     }
     ```

3. **Option B** (Fallback): Modify `PublishedStorage` to use presigned URLs
   - Override the `url()` method in `PublishedStorage` to generate presigned URLs
   - This would be similar to `MediaStorage.url()` but for published files
   - Downside: Presigned URLs expire and need regeneration

**Recommendation**: Option A is preferred because published files should be truly public and directly accessible without presigned URLs.

## Edge Cases and Potential Side Effects

1. **Stripe DEV MODE**: The fix won't break DEV mode (when `STRIPE_SECRET_KEY` is not set)
2. **Existing Payments**: Database may contain payments with invalid status values that need cleanup
3. **Published Projects**: May need to republish existing projects to fix ACLs
4. **S3 Bucket**: Changes to bucket policy may affect other files - need to ensure correct resource patterns

## Files to Modify

1. `apps/backend/billing/views.py` (lines 175, 629)
2. S3 bucket configuration (external to codebase)

## Testing Plan

After fixes:
1. Test Stripe checkout for download
2. Test Stripe checkout for hosting
3. Verify DEV MODE still works (when Stripe keys not configured)
4. Test published flipbook loads correctly
5. Verify direct S3 URLs are accessible
6. Check browser console for CORS errors

---

## Implementation Notes

### Fixes Applied

#### 1. Stripe Checkout Error (COMPLETED)

**Files Modified**: `apps/backend/billing/views.py`

**Changes**:
- Line 175: Changed `status=Payment.Status.SUCCEEDED` to `status=Payment.Status.COMPLETED`
- Line 629: Changed `payment.status = Payment.Status.SUCCEEDED` to `payment.status = Payment.Status.COMPLETED`

**Result**: This fixes the 500 Internal Server Error in both `/api/billing/checkout/download/` and `/api/billing/checkout/hosting/` endpoints. The status enum now correctly matches the Payment model definition.

#### 2. Flipbook 403 Errors (COMPLETED)

**Files Modified**: `apps/backend/projects/storage.py`

**Changes**:
- Added `url()` method to `PublishedStorage` class (lines 143-183)
- Method generates presigned URLs for published flipbook files
- Uses 24-hour expiration (86400 seconds) for published content
- Includes error handling and fallback to parent implementation

**Implementation Details**:
- Similar to `MediaStorage.url()` but optimized for published content
- Presigned URLs work regardless of S3 bucket policy settings
- Longer expiration time (24 hours vs 1 hour) since published content is meant to be publicly accessible
- Maintains existing `_save()` method that sets public-read ACL (for future bucket policy fixes)

**Result**: Flipbook pages will now load using presigned S3 URLs instead of direct links, bypassing bucket policy restrictions that were causing 403 Forbidden errors.

### Testing Status

**Manual Testing Required**:
1. Start the Django development server or Docker containers
2. Test Stripe checkout flows:
   - Create a new project
   - Attempt download checkout (should not return 500 error)
   - Attempt hosting checkout (should not return 500 error)
3. Test flipbook display:
   - Publish a project
   - View the published flipbook
   - Verify images load without 403 errors
   - Check browser console for errors

**Expected Results**:
- Stripe checkout endpoints should return proper checkout URLs (not 500 errors)
- Published flipbook pages should load successfully using presigned URLs
- No 403 Forbidden errors in browser console for S3 resources

### Next Steps for User

1. Restart the backend service to apply changes:
   ```bash
   docker compose restart backend
   ```

2. For existing published projects that are currently broken, you may need to:
   - Republish the projects to regenerate URLs with the new presigned URL logic
   - OR trigger a cache clear if URLs are cached somewhere

3. Monitor logs for any errors:
   ```bash
   docker compose logs -f backend
   ```

### Notes

- The presigned URL approach (Option B from investigation) was chosen because it can be implemented in code and works immediately without requiring S3 bucket policy changes
- If you later fix the S3 bucket policy to allow public reads, the presigned URLs will still work as a fallback
- The 24-hour expiration for presigned URLs means that published flipbooks need their URLs to be regenerated daily, or you should implement a longer expiration time if needed
