"""
Stripe Billing Views
"""
import stripe
import logging
from datetime import datetime
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from accounts.models import User
from projects.models import Project
from .models import StripeCustomer, Payment, Subscription, WebhookEvent

logger = logging.getLogger(__name__)

# CRITICAL: Initialize Stripe module immediately on import
# Import checkout module explicitly to ensure it's loaded
try:
    from stripe import checkout
    from stripe.checkout import Session as CheckoutSession
    from stripe.billing_portal import Session as BillingPortalSession
    STRIPE_MODULES_AVAILABLE = True
except (ImportError, AttributeError) as e:
    logger.warning(f"Stripe modules not available on import: {e}")
    STRIPE_MODULES_AVAILABLE = False
    checkout = None
    CheckoutSession = None
    BillingPortalSession = None

# Initialize Stripe - ALWAYS set the key if available
# The api_key MUST be set before any Stripe API calls
# Setting it to None breaks the stripe module's internal structure
# NEVER set stripe.api_key to None - it breaks the module

# Helper function to safely set Stripe API key
def ensure_stripe_api_key():
    """Ensure stripe.api_key is set if a valid key is available"""
    # Check if we have a valid Stripe secret key
    if not settings.STRIPE_SECRET_KEY:
        logger.warning("STRIPE_SECRET_KEY is not set")
        return False
    
    # Check if key is long enough (valid Stripe keys are much longer)
    if len(settings.STRIPE_SECRET_KEY) <= 10:
        logger.warning(f"STRIPE_SECRET_KEY is too short ({len(settings.STRIPE_SECRET_KEY)} chars) - likely invalid")
        return False
    
    # Check if key starts with sk_ (Stripe secret keys start with sk_test_ or sk_live_)
    if not settings.STRIPE_SECRET_KEY.startswith('sk_'):
        logger.warning(f"STRIPE_SECRET_KEY does not start with 'sk_' - likely invalid")
        return False
    
    # CRITICAL: Set the API key
    stripe.api_key = settings.STRIPE_SECRET_KEY
    logger.info("Stripe API key set/updated")
    
    # Verify that we can import Stripe modules
    # We use direct imports in the views, so we just verify the import works
    try:
        from stripe.checkout import Session as CheckoutSession
        # Verify it's callable
        if not callable(CheckoutSession.create):
            logger.error("CheckoutSession.create is not callable")
            return False
        logger.debug("Stripe checkout module verified")
    except (AttributeError, ImportError) as e:
        logger.error(f"Stripe checkout module not available after setting api_key: {e}")
        return False
    
    # Final verification
    if not stripe.api_key:
        logger.error("stripe.api_key is None after setting - this should not happen!")
        return False
    
    return True

# Initialize on module load
ensure_stripe_api_key()


def get_or_create_stripe_customer(user):
    """Get or create Stripe customer for user"""
    # Check if Stripe is properly configured
    # Must check settings directly, not stripe.api_key, because it might be None even if key is set
    if not settings.STRIPE_SECRET_KEY or len(settings.STRIPE_SECRET_KEY) <= 10:
        # DEV MODE: Return mock customer
        logger.info(f"DEV MODE: Creating mock Stripe customer for user {user.id}")
        customer, _ = StripeCustomer.objects.get_or_create(
            user=user,
            defaults={'stripe_customer_id': f'cus_dev_{user.id}'}
        )
        return customer
    
    # Ensure stripe.api_key is set BEFORE any Stripe API calls
    # This is critical - the stripe module breaks if api_key is None when APIs are called
    if not ensure_stripe_api_key():
        # DEV MODE: Return mock customer
        logger.info(f"DEV MODE: Creating mock Stripe customer for user {user.id}")
        customer, _ = StripeCustomer.objects.get_or_create(
            user=user,
            defaults={'stripe_customer_id': f'cus_dev_{user.id}'}
        )
        return customer
    
    # Final verification that stripe.api_key is set (should never be None at this point)
    if not stripe.api_key:
        logger.error("stripe.api_key is None after ensure_stripe_api_key() - this should not happen")
        # Return mock customer instead of crashing
        customer, _ = StripeCustomer.objects.get_or_create(
            user=user,
            defaults={'stripe_customer_id': f'cus_dev_{user.id}'}
        )
        return customer
    
    # Check if customer already exists
    try:
        return user.stripe_customer
    except StripeCustomer.DoesNotExist:
        try:
            logger.info(f"Creating Stripe customer for user {user.email}")
            customer = stripe.Customer.create(
                email=user.email,
                metadata={'user_id': user.id}
            )
            logger.info(f"Stripe customer created: {customer.id}")
            return StripeCustomer.objects.create(
                user=user,
                stripe_customer_id=customer.id
            )
        except AttributeError as e:
            # This happens when stripe.api_key is None and Stripe tries to access internal modules
            logger.error(f"Stripe module error (api_key may be None): {e}", exc_info=True)
            # Return mock customer instead of crashing
            customer, _ = StripeCustomer.objects.get_or_create(
                user=user,
                defaults={'stripe_customer_id': f'cus_dev_{user.id}'}
            )
            return customer
        except stripe.error.StripeError as e:
            logger.error(f"Stripe API error creating customer: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating Stripe customer: {e}", exc_info=True)
            raise


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def checkout_download(request):
    """Create checkout session for download payment"""
    # Ensure Stripe API key is set before any operations
    if not ensure_stripe_api_key():
        # DEV MODE handling is done in the function body
        pass
    
    project_id = request.data.get('project_id')
    
    if not project_id:
        return Response(
            {'error': 'project_id is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        project = Project.objects.get(id=project_id, user=request.user)
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if already purchased
    if project.download_enabled:
        return Response(
            {'error': 'Download already enabled for this project'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # DEV MODE: Skip payment and enable download directly
    # Check settings directly, not stripe.api_key (which might be None)
    if not settings.STRIPE_SECRET_KEY or len(settings.STRIPE_SECRET_KEY) <= 10:
        project.download_enabled = True
        project.save()
        
        Payment.objects.create(
            user=request.user,
            project=project,
            stripe_payment_intent_id=f'pi_dev_{project.id}',
            amount=0,
            currency='EUR',
            status=Payment.Status.SUCCEEDED,
            payment_type=Payment.PaymentType.DOWNLOAD
        )
        
        return Response({
            'message': 'Download enabled (DEV MODE - no payment required)',
            'checkout_url': f"{settings.SITE_URL}/app/projects/{project.slug}?payment=success"
        })
    
    # Validate Stripe configuration
    if not settings.STRIPE_SECRET_KEY or len(settings.STRIPE_SECRET_KEY) <= 10:
        logger.error("STRIPE_SECRET_KEY not configured or invalid")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Ensure Stripe API key is set before creating checkout session
    if not ensure_stripe_api_key():
        logger.error("Failed to set Stripe API key")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    if not stripe.api_key:
        logger.error("stripe.api_key is None - cannot create checkout session")
        return Response(
            {'error': 'Payment system error. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    if not settings.STRIPE_DOWNLOAD_PRICE_ID:
        logger.error("STRIPE_DOWNLOAD_PRICE_ID not configured")
        return Response(
            {'error': 'Download price not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    try:
        stripe_customer = get_or_create_stripe_customer(request.user)
    except Exception as e:
        logger.error(f"Failed to get/create Stripe customer: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Create checkout session
    # Use direct import to avoid AttributeError
    try:
        from stripe.checkout import Session as CheckoutSession
        checkout_session = CheckoutSession.create(
            customer=stripe_customer.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': settings.STRIPE_DOWNLOAD_PRICE_ID,
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{settings.SITE_URL}/app/projects/{project.slug}?payment=success",
            cancel_url=f"{settings.SITE_URL}/app/projects/{project.slug}?payment=canceled",
            metadata={
                'user_id': request.user.id,
                'project_id': project.id,
                'payment_type': 'download'
            }
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API Error creating checkout session for download: {e}", exc_info=True)
        return Response(
            {'error': f'Payment system error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Unexpected error creating checkout session for download: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Record pending payment
    Payment.objects.create(
        user=request.user,
        project=project,
        stripe_payment_intent_id=checkout_session.payment_intent,
        amount=0,  # Will be updated from webhook
        currency='EUR',
        status=Payment.Status.PENDING
    )
    
    return Response({
        'checkout_url': checkout_session.url,
        'session_id': checkout_session.id
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def checkout_hosting(request):
    """Create checkout session for hosting subscription"""
    # DEV MODE: Enable hosting directly
    # Check settings directly, not stripe.api_key (which might be None and break the module)
    if not settings.STRIPE_SECRET_KEY or len(settings.STRIPE_SECRET_KEY) <= 10:
        from datetime import timedelta
        user = request.user
        user.hosting_enabled = True
        user.hosting_enabled_until = timezone.now() + timedelta(days=365)
        user.save()
        
        Subscription.objects.update_or_create(
            user=user,
            defaults={
                'stripe_subscription_id': f'sub_dev_{user.id}',
                'stripe_price_id': 'price_dev',
                'status': Subscription.Status.ACTIVE,
                'current_period_start': timezone.now(),
                'current_period_end': timezone.now() + timedelta(days=365),
            }
        )
        
        return Response({
            'message': 'Hosting enabled (DEV MODE - no payment required)',
            'checkout_url': f"{settings.SITE_URL}/app/dashboard?subscription=success"
        })
    
    # Validate Stripe configuration
    if not settings.STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY not configured")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    if not settings.STRIPE_HOSTING_PRICE_ID:
        logger.error("STRIPE_HOSTING_PRICE_ID not configured")
        return Response(
            {'error': 'Hosting price not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Ensure stripe.api_key is set before calling get_or_create_stripe_customer
    # This is critical - the stripe module breaks if api_key is None when APIs are called
    if not ensure_stripe_api_key():
        logger.error("STRIPE_SECRET_KEY is not valid - cannot create checkout session")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    try:
        stripe_customer = get_or_create_stripe_customer(request.user)
    except AttributeError as e:
        # This happens when stripe.api_key is None and Stripe tries to access internal modules
        logger.error(f"Stripe module error (api_key may be None): {e}", exc_info=True)
        return Response(
            {'error': 'Payment system error. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Failed to get/create Stripe customer: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Check if user already has active subscription
    active_sub = Subscription.objects.filter(
        user=request.user,
        status=Subscription.Status.ACTIVE
    ).first()
    
    if active_sub:
        return Response(
            {'error': 'You already have an active hosting subscription'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create checkout session
    # CRITICAL: Ensure stripe.api_key is set before calling any Stripe API
    # The stripe module breaks if api_key is None when APIs are called
    if not ensure_stripe_api_key():
        logger.error("STRIPE_SECRET_KEY is not valid - cannot create checkout session")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Final verification that stripe.api_key is set
    if not stripe.api_key:
        logger.error("stripe.api_key is None - cannot create checkout session")
        return Response(
            {'error': 'Payment system error. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Create checkout session using direct import to avoid AttributeError
    try:
        from stripe.checkout import Session as CheckoutSession
        checkout_session = CheckoutSession.create(
            customer=stripe_customer.stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': settings.STRIPE_HOSTING_PRICE_ID,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{settings.SITE_URL}/app/dashboard?subscription=success",
            cancel_url=f"{settings.SITE_URL}/app/dashboard?subscription=canceled",
            metadata={
                'user_id': request.user.id,
                'payment_type': 'hosting'
            }
        )
    except (ImportError, AttributeError) as e:
        logger.error(f"Cannot import or use stripe.checkout.Session: {e}", exc_info=True)
        return Response(
            {'error': 'Payment system error. Stripe module not initialized. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error creating checkout session for hosting: {e}", exc_info=True)
        return Response(
            {'error': f'Payment system error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Unexpected error creating checkout session for hosting: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return Response({
        'checkout_url': checkout_session.url,
        'session_id': checkout_session.id
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def billing_portal(request):
    """Create billing portal session"""
    # DEV MODE: Return dashboard URL
    if not stripe.api_key or not settings.STRIPE_SECRET_KEY or len(settings.STRIPE_SECRET_KEY) <= 10:
        return Response({
            'portal_url': f"{settings.SITE_URL}/app/dashboard",
            'message': 'DEV MODE: Billing portal not available'
        })
    
    # Validate Stripe configuration
    if not settings.STRIPE_SECRET_KEY or len(settings.STRIPE_SECRET_KEY) <= 10:
        logger.error("STRIPE_SECRET_KEY not configured or invalid")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Ensure Stripe API key is set before creating billing portal session
    if not ensure_stripe_api_key():
        logger.error("Failed to set Stripe API key")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    if not stripe.api_key:
        logger.error("stripe.api_key is None - cannot create billing portal session")
        return Response(
            {'error': 'Payment system error. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    try:
        stripe_customer = get_or_create_stripe_customer(request.user)
    except Exception as e:
        logger.error(f"Failed to get/create Stripe customer: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to access billing portal: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    try:
        # Use direct import to avoid AttributeError
        from stripe.billing_portal import Session as BillingPortalSession
        portal_session = BillingPortalSession.create(
            customer=stripe_customer.stripe_customer_id,
            return_url=f"{settings.SITE_URL}/app/dashboard",
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error creating billing portal session: {e}", exc_info=True)
        return Response(
            {'error': f'Payment system error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Unexpected error creating billing portal session: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to access billing portal: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return Response({
        'portal_url': portal_session.url
    })


@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook(request):
    """Handle Stripe webhooks"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return Response({'error': 'Webhook not configured'}, status=400)
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid webhook payload")
        return Response({'error': 'Invalid payload'}, status=400)
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid webhook signature")
        return Response({'error': 'Invalid signature'}, status=400)
    
    # Store webhook event
    webhook_event = WebhookEvent.objects.create(
        stripe_event_id=event['id'],
        event_type=event['type'],
        payload=event
    )
    
    # Handle the event
    try:
        if event['type'] == 'checkout.session.completed':
            handle_checkout_session_completed(event['data']['object'])
        elif event['type'] == 'payment_intent.succeeded':
            handle_payment_intent_succeeded(event['data']['object'])
        elif event['type'] == 'customer.subscription.created':
            handle_subscription_created(event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        elif event['type'] == 'invoice.payment_succeeded':
            handle_invoice_payment_succeeded(event['data']['object'])
        elif event['type'] == 'invoice.payment_failed':
            handle_invoice_payment_failed(event['data']['object'])
        
        webhook_event.processed = True
        webhook_event.save()
        
    except Exception as e:
        logger.error(f"Error processing webhook {event['type']}: {str(e)}", exc_info=True)
        webhook_event.error = str(e)
        webhook_event.save()
        return Response({'error': str(e)}, status=500)
    
    return Response({'status': 'success'})


def handle_checkout_session_completed(session):
    """Handle successful checkout"""
    user_id = session['metadata'].get('user_id')
    payment_type = session['metadata'].get('payment_type')
    
    if not user_id:
        logger.error("No user_id in checkout session metadata")
        return
    
    user = User.objects.get(id=user_id)
    
    if payment_type == 'download':
        project_id = session['metadata'].get('project_id')
        if not project_id:
            logger.error("No project_id in checkout session metadata")
            return
        
        project = Project.objects.get(id=project_id)
        project.download_enabled = True
        project.save()
        
        # Update payment record
        payment = Payment.objects.filter(
            user=user,
            project=project,
            status=Payment.Status.PENDING
        ).first()
        
        if payment:
            payment.stripe_payment_intent_id = session.get('payment_intent')
            payment.status = Payment.Status.SUCCEEDED
            payment.amount = session.get('amount_total', 0) / 100  # Convert from cents
            payment.save()


def handle_payment_intent_succeeded(payment_intent):
    """Handle successful payment intent"""
    logger.info(f"Payment intent succeeded: {payment_intent['id']}")


def handle_subscription_created(subscription):
    """Handle new subscription"""
    customer_id = subscription['customer']
    
    try:
        stripe_customer = StripeCustomer.objects.get(stripe_customer_id=customer_id)
    except StripeCustomer.DoesNotExist:
        logger.error(f"Stripe customer {customer_id} not found")
        return
    
    user = stripe_customer.user
    
    # Enable hosting
    from datetime import timedelta
    user.hosting_enabled = True
    user.hosting_enabled_until = timezone.now() + timedelta(days=365)
    user.save()
    
    # Create subscription record
    Subscription.objects.update_or_create(
        stripe_subscription_id=subscription['id'],
        defaults={
            'user': user,
            'stripe_price_id': subscription['items']['data'][0]['price']['id'],
            'status': Subscription.Status.ACTIVE,
            'current_period_start': datetime.fromtimestamp(subscription['current_period_start'], tz=timezone.utc),
            'current_period_end': datetime.fromtimestamp(subscription['current_period_end'], tz=timezone.utc),
        }
    )


def handle_subscription_updated(subscription):
    """Handle subscription update"""
    try:
        sub = Subscription.objects.get(stripe_subscription_id=subscription['id'])
        sub.status = subscription['status']
        sub.current_period_start = datetime.fromtimestamp(subscription['current_period_start'], tz=timezone.utc)
        sub.current_period_end = datetime.fromtimestamp(subscription['current_period_end'], tz=timezone.utc)
        sub.save()
        
        # Update hosting status
        if subscription['status'] == 'active':
            sub.user.hosting_enabled = True
            sub.user.hosting_enabled_until = sub.current_period_end
            sub.user.save()
        elif subscription['status'] in ['canceled', 'unpaid', 'past_due']:
            sub.user.hosting_enabled = False
            sub.user.save()
    except Subscription.DoesNotExist:
        logger.error(f"Subscription {subscription['id']} not found")


def handle_subscription_deleted(subscription):
    """Handle subscription cancellation"""
    try:
        sub = Subscription.objects.get(stripe_subscription_id=subscription['id'])
        sub.status = Subscription.Status.CANCELED
        sub.save()
        
        # Disable hosting
        sub.user.hosting_enabled = False
        sub.user.save()
    except Subscription.DoesNotExist:
        logger.error(f"Subscription {subscription['id']} not found")


def handle_invoice_payment_succeeded(invoice):
    """Handle successful invoice payment"""
    logger.info(f"Invoice payment succeeded: {invoice['id']}")


def handle_invoice_payment_failed(invoice):
    """Handle failed invoice payment"""
    logger.warning(f"Invoice payment failed: {invoice['id']}")
    
    subscription_id = invoice.get('subscription')
    if subscription_id:
        try:
            sub = Subscription.objects.get(stripe_subscription_id=subscription_id)
            sub.user.hosting_enabled = False
            sub.user.save()
        except Subscription.DoesNotExist:
            logger.error(f"Subscription {subscription_id} not found")
