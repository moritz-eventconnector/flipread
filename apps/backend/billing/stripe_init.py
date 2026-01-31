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
    # Check if we have a valid Stripe secret key
    if settings.STRIPE_SECRET_KEY and len(settings.STRIPE_SECRET_KEY) > 10 and settings.STRIPE_SECRET_KEY.startswith('sk_'):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        logger.info("Stripe API key set successfully on module load")
    else:
        stripe.api_key = None
        logger.warning("STRIPE_SECRET_KEY is not configured or invalid - Stripe features will be disabled")
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
    if not stripe.api_key:
        return initialize_stripe()
    return True

def get_stripe_checkout_session():
    """Safely import and return CheckoutSession class"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    try:
        from stripe.checkout import Session as CheckoutSession
        return CheckoutSession
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.checkout.Session: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def get_stripe_billing_portal_session():
    """Safely import and return BillingPortalSession class"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    try:
        from stripe.billing_portal import Session as BillingPortalSession
        return BillingPortalSession
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.billing_portal.Session: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def get_stripe_customer():
    """Safely import and return Customer class"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    try:
        from stripe import Customer
        return Customer
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.Customer: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def get_stripe_error():
    """Safely import and return stripe.error module"""
    if stripe is None:
        raise ValueError("Stripe module is not available. Please install the stripe package.")
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    try:
        from stripe import error
        return error
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.error: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def get_stripe_webhook():
    """Safely import and return Webhook class"""
    if not ensure_stripe_api_key():
        raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    try:
        from stripe import Webhook
        return Webhook
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import stripe.Webhook: {e}", exc_info=True)
        raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")

def is_stripe_api_key_set():
    """Check if stripe.api_key is set (without raising errors)"""
    try:
        if stripe is None:
            return False
        return bool(stripe.api_key)
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

