"""
Stripe Billing Views
"""
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
from .stripe_init import (
    ensure_stripe_api_key,
    get_stripe_checkout_session,
    get_stripe_billing_portal_session
)
import stripe

logger = logging.getLogger(__name__)


def get_or_create_stripe_customer(user):
    """Get or create Stripe customer for user"""
    # Check if Stripe is properly configured
    # Must check settings directly, not stripe.api_key, because it might be None even if key is set
    if not settings.STRIPE_SECRET_KEY or len(settings.STRIPE_SECRET_KEY) <= 10:
        # Stripe not configured - raise error instead of creating mock customer
        logger.error(f"STRIPE_SECRET_KEY not configured or invalid (length: {len(settings.STRIPE_SECRET_KEY) if settings.STRIPE_SECRET_KEY else 0})")
        raise ValueError("Stripe is not properly configured. Please set STRIPE_SECRET_KEY in your environment.")
    
    # Ensure stripe.api_key is set BEFORE any Stripe API calls
    # This is critical - the stripe module breaks if api_key is None when APIs are called
    if not ensure_stripe_api_key():
        # Stripe key validation failed - raise error instead of creating mock customer
        logger.error(f"STRIPE_SECRET_KEY validation failed for user {user.id}")
        raise ValueError("Stripe API key validation failed. Please check your STRIPE_SECRET_KEY configuration.")
    
    # Final verification that stripe.api_key is set (should never be None at this point)
    if not stripe.api_key:
        logger.error("stripe.api_key is None after ensure_stripe_api_key() - this should not happen")
        raise ValueError("Stripe API key is not set. Please check your configuration.")
    
    # Check if customer already exists
    try:
        stripe_customer = user.stripe_customer
        # Check if this is a mock customer (cus_dev_*) - if so, replace it with a real one
        if stripe_customer.stripe_customer_id.startswith('cus_dev_'):
            logger.warning(f"Found mock customer {stripe_customer.stripe_customer_id} for user {user.email} - replacing with real Stripe customer")
            # Delete the mock customer entry
            old_customer_id = stripe_customer.stripe_customer_id
            stripe_customer.delete()
            # Create a real Stripe customer
            try:
                logger.info(f"Creating real Stripe customer for user {user.email} (replacing mock {old_customer_id})")
                if not ensure_stripe_api_key():
                    raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
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
                logger.error(f"Stripe module error (api_key may be None): {e}", exc_info=True)
                raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")
            except stripe.error.StripeError as e:
                logger.error(f"Stripe API error creating customer: {e}", exc_info=True)
                raise
            except Exception as e:
                logger.error(f"Unexpected error creating Stripe customer: {e}", exc_info=True)
                raise
        # Valid Stripe customer - return it
        return stripe_customer
    except StripeCustomer.DoesNotExist:
        try:
            logger.info(f"Creating Stripe customer for user {user.email}")
            if not ensure_stripe_api_key():
                raise ValueError("Stripe API key is not configured. Please set STRIPE_SECRET_KEY in your environment.")
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
            raise ValueError(f"Stripe module error: {str(e)}. Please check your Stripe configuration.")
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
    
    # Accept both project_id and project_slug
    project_id = request.data.get('project_id')
    project_slug = request.data.get('project_slug')
    
    if not project_id and not project_slug:
        return Response(
            {'error': 'project_id or project_slug is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        if project_id:
            project = Project.objects.get(id=project_id, user=request.user)
        else:
            project = Project.objects.get(slug=project_slug, user=request.user)
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
    # Use safe import helper to avoid AttributeError
    try:
        CheckoutSession = get_stripe_checkout_session()
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
    except ValueError as e:
        logger.error(f"Stripe initialization error: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
    
    # Get or create Stripe customer
    try:
        stripe_customer = get_or_create_stripe_customer(request.user)
    except ValueError as e:
        # Stripe configuration error
        logger.error(f"Stripe configuration error: {e}", exc_info=True)
        return Response(
            {'error': f'Payment system configuration error: {str(e)}. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
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
    
    # Create checkout session using safe import helper
    try:
        CheckoutSession = get_stripe_checkout_session()
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
    except ValueError as e:
        logger.error(f"Stripe initialization error: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
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
        # Use safe import helper to avoid AttributeError
        BillingPortalSession = get_stripe_billing_portal_session()
        portal_session = BillingPortalSession.create(
            customer=stripe_customer.stripe_customer_id,
            return_url=f"{settings.SITE_URL}/app/dashboard",
        )
    except ValueError as e:
        logger.error(f"Stripe initialization error: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to access billing portal: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
