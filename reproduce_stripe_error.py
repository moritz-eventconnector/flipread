
import os
import sys

# Add apps/backend to path
sys.path.append(os.path.join(os.getcwd(), 'apps', 'backend'))

# Mock Django settings
class MockSettings:
    STRIPE_SECRET_KEY = None
    STRIPE_PUBLISHABLE_KEY = ""
    STRIPE_WEBHOOK_SECRET = ""
    STRIPE_DOWNLOAD_PRICE_ID = ""
    STRIPE_HOSTING_PRICE_ID = ""

import django.conf
from django.conf import settings

if not settings.configured:
    settings.configure(
        STRIPE_SECRET_KEY=None,
        STRIPE_PUBLISHABLE_KEY="",
        STRIPE_WEBHOOK_SECRET="",
        STRIPE_DOWNLOAD_PRICE_ID="",
        STRIPE_HOSTING_PRICE_ID="",
        INSTALLED_APPS=[],
        DATABASES={},
    )

print("Starting reproduction...")

try:
    from billing.stripe_init import get_stripe_checkout_session
    print("Imported get_stripe_checkout_session")
    
    # Try with None key
    print("\nTest 1: STRIPE_SECRET_KEY = None")
    settings.STRIPE_SECRET_KEY = None
    try:
        get_stripe_checkout_session()
    except Exception as e:
        print(f"Caught expected error: {e}")

    # Try with invalid key
    print("\nTest 2: STRIPE_SECRET_KEY = 'invalid'")
    settings.STRIPE_SECRET_KEY = "invalid"
    try:
        get_stripe_checkout_session()
    except Exception as e:
        print(f"Caught expected error: {e}")

    # Try with valid-looking key but then set to None
    print("\nTest 3: Valid key then simulate failure")
    settings.STRIPE_SECRET_KEY = "sk_test_1234567890"
    
    # We need to force re-initialization if it was already initialized
    from billing.stripe_init import initialize_stripe, stripe
    initialize_stripe()
    print(f"stripe.api_key after initialization: {stripe.api_key}")
    
    # Now try to import submodule
    session = get_stripe_checkout_session()
    print(f"Successfully got session: {session}")

except Exception as e:
    print(f"Unexpected error: {e}")
    import traceback
    traceback.print_exc()
