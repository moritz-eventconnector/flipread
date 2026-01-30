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

# Initialize Stripe only if keys are configured
if settings.STRIPE_SECRET_KEY and not settings.STRIPE_SECRET_KEY.startswith('sk_test_dev'):
    stripe.api_key = settings.STRIPE_SECRET_KEY
else:
    logger.warning("Stripe not configured - running in DEV mode")
    stripe.api_key = None


def get_or_create_stripe_customer(user):
    """Get or create Stripe customer for user"""
    if not stripe.api_key or stripe.api_key.startswith('sk_test_dev'):
        # DEV MODE: Return mock customer
        customer, _ = StripeCustomer.objects.get_or_create(
            user=user,
            defaults={'stripe_customer_id': f'cus_dev_{user.id}'}
        )
        return customer
    
    try:
        return user.stripe_customer
    except StripeCustomer.DoesNotExist:
        try:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={'user_id': user.id}
            )
            return StripeCustomer.objects.create(
                user=user,
                stripe_customer_id=customer.id
            )
        except stripe.error.StripeError as e:
            logger.error(f"Stripe API error creating customer: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating Stripe customer: {e}", exc_info=True)
            raise


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def checkout_download(request):
    """Create checkout session for download (one-time payment)"""
    project_slug = request.data.get('project_slug')
    
    if not project_slug:
        return Response(
            {'error': 'project_slug required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        project = Project.objects.get(slug=project_slug, user=request.user)
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if project.download_enabled:
        return Response(
            {'error': 'Download already enabled'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # DEV MODE: Skip payment and enable download directly
    if not stripe.api_key or stripe.api_key.startswith('sk_test_dev'):
        project.download_enabled = True
        project.download_paid_at = timezone.now()
        project.save()
        
        Payment.objects.create(
            user=request.user,
            project=project,
            payment_type=Payment.PaymentType.DOWNLOAD,
            stripe_payment_intent_id='dev_payment',
            stripe_checkout_session_id='dev_session',
            amount=9.90,
            currency='EUR',
            status=Payment.Status.COMPLETED,
            completed_at=timezone.now()
        )
        
        return Response({
            'message': 'Download enabled (DEV MODE - no payment required)',
            'checkout_url': f"{settings.SITE_URL}/app/projects/{project.slug}?payment=success"
        })
    
    # Validate Stripe configuration
    if not settings.STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY not configured")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    if not settings.STRIPE_DOWNLOAD_PRICE_ID:
        logger.error("STRIPE_DOWNLOAD_PRICE_ID not configured")
        return Response(
            {'error': 'Download price not configured. Please contact support.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Get or create Stripe customer
    try:
        stripe_customer = get_or_create_stripe_customer(request.user)
    except Exception as e:
        logger.error(f"Failed to get/create Stripe customer: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Create checkout session
    try:
        checkout_session = stripe.checkout.Session.create(
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
        logger.error(f"Stripe API error creating checkout session: {e}", exc_info=True)
        return Response(
            {'error': f'Payment system error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Unexpected error creating checkout session: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Create payment record
    Payment.objects.create(
        user=request.user,
        project=project,
        payment_type=Payment.PaymentType.DOWNLOAD,
        stripe_payment_intent_id='',  # Will be updated from webhook
        stripe_checkout_session_id=checkout_session.id,
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
    if not stripe.api_key or stripe.api_key.startswith('sk_test_dev'):
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
    
    # Get or create Stripe customer
    try:
        stripe_customer = get_or_create_stripe_customer(request.user)
    except Exception as e:
        logger.error(f"Failed to get/create Stripe customer: {e}", exc_info=True)
        return Response(
            {'error': f'Failed to create payment session: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Check if user already has active subscription
    try:
        subscription = request.user.subscription
        if subscription.is_active:
            return Response(
                {'error': 'Active subscription already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except Subscription.DoesNotExist:
        pass
    
    # Create checkout session
    try:
        checkout_session = stripe.checkout.Session.create(
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
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error creating checkout session: {e}", exc_info=True)
        return Response(
            {'error': f'Payment system error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        logger.error(f"Unexpected error creating checkout session: {e}", exc_info=True)
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
    if not stripe.api_key or stripe.api_key.startswith('sk_test_dev'):
        return Response({
            'portal_url': f"{settings.SITE_URL}/app/dashboard",
            'message': 'DEV MODE: Billing portal not available'
        })
    
    # Validate Stripe configuration
    if not settings.STRIPE_SECRET_KEY:
        logger.error("STRIPE_SECRET_KEY not configured")
        return Response(
            {'error': 'Payment system not configured. Please contact support.'},
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
        portal_session = stripe.billing_portal.Session.create(
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


@api_view(['POST'])
@csrf_exempt
@permission_classes([permissions.AllowAny])
def webhook(request):
    """Stripe webhook handler"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid payload")
        return Response({'error': 'Invalid payload'}, status=400)
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid signature")
        return Response({'error': 'Invalid signature'}, status=400)
    
    # Log webhook event
    webhook_event, created = WebhookEvent.objects.get_or_create(
        stripe_event_id=event['id'],
        defaults={
            'event_type': event['type'],
            'data': event
        }
    )
    
    if not created:
        # Already processed
        return Response({'status': 'already_processed'})
    
    # Handle event
    try:
        if event['type'] == 'checkout.session.completed':
            handle_checkout_session_completed(event['data']['object'])
        elif event['type'] == 'invoice.paid':
            handle_invoice_paid(event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        
        webhook_event.processed = True
        webhook_event.save()
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}", exc_info=True)
        webhook_event.error_message = str(e)
        webhook_event.save()
        return Response({'error': str(e)}, status=500)
    
    return Response({'status': 'success'})


def handle_checkout_session_completed(session):
    """Handle checkout.session.completed event"""
    metadata = session.get('metadata', {})
    payment_type = metadata.get('payment_type')
    user_id = metadata.get('user_id')
    
    if not user_id:
        return
    
    user = User.objects.get(id=user_id)
    
    if payment_type == 'download':
        project_id = metadata.get('project_id')
        if project_id:
            try:
                project = Project.objects.get(id=project_id)
                project.download_enabled = True
                project.download_paid_at = timezone.now()
                project.download_stripe_payment_intent_id = session.get('payment_intent', '')
                project.save()
                
                # Update payment record
                payment = Payment.objects.filter(
                    stripe_checkout_session_id=session['id']
                ).first()
                if payment:
                    payment.status = Payment.Status.COMPLETED
                    payment.completed_at = timezone.now()
                    payment.stripe_payment_intent_id = session.get('payment_intent', '')
                    payment.amount = session.get('amount_total', 0) / 100  # Convert from cents
                    payment.save()
            except Project.DoesNotExist:
                pass
    
    elif payment_type == 'hosting':
        # Subscription will be handled by invoice.paid
        pass


def handle_invoice_paid(invoice):
    """Handle invoice.paid event"""
    customer_id = invoice.get('customer')
    subscription_id = invoice.get('subscription')
    
    if not subscription_id:
        return
    
    try:
        stripe_customer = StripeCustomer.objects.get(stripe_customer_id=customer_id)
        user = stripe_customer.user
        
        # Get subscription from Stripe
        subscription_obj = stripe.Subscription.retrieve(subscription_id)
        
        # Update or create subscription
        subscription, created = Subscription.objects.update_or_create(
            stripe_subscription_id=subscription_id,
            defaults={
                'user': user,
                'stripe_price_id': subscription_obj['items']['data'][0]['price']['id'],
                'status': subscription_obj['status'],
                'current_period_start': timezone.make_aware(
                    datetime.fromtimestamp(subscription_obj['current_period_start'])
                ),
                'current_period_end': timezone.make_aware(
                    datetime.fromtimestamp(subscription_obj['current_period_end'])
                ),
                'cancel_at_period_end': subscription_obj.get('cancel_at_period_end', False),
                'metadata': subscription_obj.get('metadata', {})
            }
        )
        
        # Update user hosting status
        if subscription.is_active:
            user.hosting_enabled = True
            if subscription.current_period_end:
                user.hosting_enabled_until = subscription.current_period_end
            user.save()
        
    except StripeCustomer.DoesNotExist:
        pass


def handle_subscription_updated(subscription_obj):
    """Handle customer.subscription.updated event"""
    subscription_id = subscription_obj['id']
    customer_id = subscription_obj['customer']
    
    try:
        stripe_customer = StripeCustomer.objects.get(stripe_customer_id=customer_id)
        user = stripe_customer.user
        
        subscription, created = Subscription.objects.update_or_create(
            stripe_subscription_id=subscription_id,
            defaults={
                'user': user,
                'stripe_price_id': subscription_obj['items']['data'][0]['price']['id'],
                'status': subscription_obj['status'],
                'current_period_start': timezone.make_aware(
                    datetime.fromtimestamp(subscription_obj['current_period_start'])
                ),
                'current_period_end': timezone.make_aware(
                    datetime.fromtimestamp(subscription_obj['current_period_end'])
                ),
                'cancel_at_period_end': subscription_obj.get('cancel_at_period_end', False),
                'metadata': subscription_obj.get('metadata', {})
            }
        )
        
        # Update user hosting status
        if subscription.is_active:
            user.hosting_enabled = True
            if subscription.current_period_end:
                user.hosting_enabled_until = subscription.current_period_end
        else:
            user.hosting_enabled = False
            user.hosting_enabled_until = None
        user.save()
        
    except StripeCustomer.DoesNotExist:
        pass


def handle_subscription_deleted(subscription_obj):
    """Handle customer.subscription.deleted event"""
    subscription_id = subscription_obj['id']
    customer_id = subscription_obj['customer']
    
    try:
        stripe_customer = StripeCustomer.objects.get(stripe_customer_id=customer_id)
        user = stripe_customer.user
        
        subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)
        subscription.status = Subscription.Status.CANCELED
        subscription.canceled_at = timezone.now()
        subscription.save()
        
        # Disable user hosting
        user.hosting_enabled = False
        user.hosting_enabled_until = None
        user.save()
        
        # Unpublish all projects
        user.projects.filter(is_published=True).update(is_published=False)
        
    except (StripeCustomer.DoesNotExist, Subscription.DoesNotExist):
        pass

