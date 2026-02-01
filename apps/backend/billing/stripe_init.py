"""
Stripe Initialization Module

CRITICAL: This module MUST set stripe.api_key IMMEDIATELY after importing stripe,
BEFORE any Stripe submodules are imported or accessed.
The Stripe library's internal structure breaks if submodules are imported while api_key is None.
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# CRITICAL: Import stripe and set api_key IMMEDIATELY in one step
# This must happen before any other code runs that might trigger Stripe submodule imports
try:
    import stripe
    # Set api_key IMMEDIATELY after import, before any submodules are accessed
    # For Stripe 7.x+, setting a dummy key helps prevent lazy-loading issues
    if settings.STRIPE_SECRET_KEY and len(settings.STRIPE_SECRET_KEY) > 10 and settings.STRIPE_SECRET_KEY.startswith('sk_'):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        logger.info(f"Stripe API key set successfully on module load (length: {len(stripe.api_key)})")
    else:
        # CRITICAL: Set to a dummy key instead of None to avoid 'NoneType' object has no attribute 'Secret' errors
        # in some versions of the stripe library when submodules are imported
        stripe.api_key = "not_configured"
        logger.warning("STRIPE_SECRET_KEY is not configured or invalid - using dummy key for initialization")
    
    # Force import of submodules that are known to cause issues if lazily loaded without a key
    try:
        import stripe.apps
        import stripe.checkout
        import stripe.billing_portal
    except ImportError:
        pass
except Exception as e:
    logger.error(f"Failed to import stripe: {e}", exc_info=True)
    stripe = None

def initialize_stripe():
    """Initialize Stripe API key - MUST be called before any Stripe API calls"""
    if stripe is None:
        logger.error("stripe module is not available")
        return False
    
    # Check if we have a valid Stripe secret key
    if not settings.STRIPE_SECRET_KEY:
        logger.warning("STRIPE_SECRET_KEY is not set in settings")
        return False
    
    # Check if key is long enough (valid Stripe keys are much longer)
    if len(settings.STRIPE_SECRET_KEY) <= 10:
        logger.warning(f"STRIPE_SECRET_KEY is too short ({len(settings.STRIPE_SECRET_KEY)} chars) - likely invalid")
        return False
    
    # Check if key starts with sk_ (Stripe secret keys start with sk_test_ or sk_live_)
    if not settings.STRIPE_SECRET_KEY.startswith('sk_'):
        logger.warning(f"STRIPE_SECRET_KEY does not start with 'sk_' - likely invalid")
        return False
    
    # CRITICAL: Set the API key BEFORE any submodules are imported
    stripe.api_key = settings.STRIPE_SECRET_KEY
    logger.info("Stripe API key set successfully")
    
    # Verify that stripe.api_key is set
    if not stripe.api_key:
        logger.error("stripe.api_key is None after setting - this should not happen!")
        return False
    
    return True

def ensure_stripe_api_key():
    """Ensure stripe.api_key is set - wrapper for initialize_stripe"""
    if stripe is None:
        logger.error("stripe module is not available")
        return False
    
    # If api_key is already set and valid, return True
    if stripe.api_key and len(stripe.api_key) > 10 and stripe.api_key.startswith('sk_'):
        return True
    
    # Otherwise, try to initialize it
    if initialize_stripe():
        # Double-check that it's actually set now
        if stripe.api_key and len(stripe.api_key) > 10:
            return True
        else:
            logger.error("initialize_stripe() returned True but stripe.api_key is still not set")
            return False
    
    return False

def get_stripe_checkout_session():
    """Safely import and return CheckoutSession class"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    
    # CRITICAL: Ensure api_key is set BEFORE importing any submodules
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    # Double-check that api_key is actually set (not None)
    if not stripe.api_key:
        logger.error("stripe.api_key is None even after ensure_stripe_api_key() - this should not happen")
        raise ValueError("Stripe API key is not set. Please check your STRIPE_SECRET_KEY configuration.")
    
    try:
        # Now safe to import submodule - api_key is guaranteed to be set
        from stripe.checkout import Session as CheckoutSession
        return CheckoutSession
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.checkout.Session: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def get_stripe_billing_portal_session():
    """Safely import and return BillingPortalSession class"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    
    # CRITICAL: Ensure api_key is set BEFORE importing any submodules
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    # Double-check that api_key is actually set (not None)
    if not stripe.api_key:
        logger.error("stripe.api_key is None even after ensure_stripe_api_key() - this should not happen")
        raise ValueError("Stripe API key is not set. Please check your STRIPE_SECRET_KEY configuration.")
    
    try:
        # Now safe to import submodule - api_key is guaranteed to be set
        from stripe.billing_portal import Session as BillingPortalSession
        return BillingPortalSession
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.billing_portal.Session: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def get_stripe_customer():
    """Safely import and return Customer class"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    
    # CRITICAL: Ensure api_key is set BEFORE importing any submodules
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    # Double-check that api_key is actually set (not None)
    if not stripe.api_key:
        logger.error("stripe.api_key is None even after ensure_stripe_api_key() - this should not happen")
        raise ValueError("Stripe API key is not set. Please check your STRIPE_SECRET_KEY configuration.")
    
    try:
        # Now safe to import submodule - api_key is guaranteed to be set
        from stripe import Customer
        return Customer
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.Customer: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def get_stripe_error():
    """Safely import and return stripe.error module"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    
    # CRITICAL: Ensure api_key is set BEFORE importing any submodules
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    # Double-check that api_key is actually set (not None)
    if not stripe.api_key:
        logger.error("stripe.api_key is None even after ensure_stripe_api_key() - this should not happen")
        raise ValueError("Stripe API key is not set. Please check your STRIPE_SECRET_KEY configuration.")
    
    try:
        # Now safe to import submodule - api_key is guaranteed to be set
        from stripe import error
        return error
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.error: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def get_stripe_webhook():
    """Safely import and return Webhook class"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    
    # CRITICAL: Ensure api_key is set BEFORE importing any submodules
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    # Double-check that api_key is actually set (not None)
    if not stripe.api_key:
        logger.error("stripe.api_key is None even after ensure_stripe_api_key() - this should not happen")
        raise ValueError("Stripe API key is not set. Please check your STRIPE_SECRET_KEY configuration.")
    
    try:
        # Now safe to import submodule - api_key is guaranteed to be set
        from stripe import Webhook
        return Webhook
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.Webhook: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def is_stripe_api_key_set():
    """Check if stripe.api_key is set (without raising errors)"""
    try:
        if stripe is None or not stripe.api_key:
            return False
        # Check if it's the dummy key
        if stripe.api_key == "not_configured":
            return False
        # Valid Stripe keys start with sk_
        return stripe.api_key.startswith('sk_')
    except (AttributeError, NameError):
        return False

# Export stripe module so views can access it safely
__all__ = [
    'stripe',
    'ensure_stripe_api_key',
    'get_stripe_checkout_session',
    'get_stripe_billing_portal_session',
    'get_stripe_customer',
    'get_stripe_error',
    'get_stripe_webhook',
    'is_stripe_api_key_set',
]

