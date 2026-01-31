"""
Stripe Initialization Module

CRITICAL: This module MUST set stripe.api_key BEFORE importing stripe or any Stripe submodules.
The Stripe library's internal structure breaks if submodules are imported while api_key is None.
"""
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# CRITICAL: Import stripe ONLY after we ensure api_key can be set
# We need to check settings first, then import stripe, then set api_key immediately
import stripe

# CRITICAL: Set stripe.api_key IMMEDIATELY after importing stripe
# This must happen before any Stripe submodules are imported
# The stripe module's internal structure breaks if submodules are imported while api_key is None
def initialize_stripe():
    """Initialize Stripe API key - MUST be called before any Stripe API calls"""
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

# Initialize on module load
_initialized = initialize_stripe()

def ensure_stripe_api_key():
    """Ensure stripe.api_key is set - wrapper for initialize_stripe"""
    if not stripe.api_key:
        return initialize_stripe()
    return True

def get_stripe_checkout_session():
    """Safely import and return CheckoutSession class"""
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

