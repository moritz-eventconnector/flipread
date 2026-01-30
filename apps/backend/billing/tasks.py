"""
Billing-related Celery tasks
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import Q
from .models import Subscription
from accounts.models import User
from projects.models import Project
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_expired_subscriptions():
    """
    Periodically check for expired subscriptions and unpublish projects
    """
    try:
        now = timezone.now()
        
        # Find users with expired hosting
        expired_users = User.objects.filter(
            hosting_enabled=True
        ).filter(
            Q(hosting_enabled_until__lt=now) | Q(hosting_enabled_until__isnull=True)
        )
        
        for user in expired_users:
            # Check if user actually has an active subscription
            has_active_subscription = False
            try:
                subscription = user.subscription
                if subscription and subscription.is_active:
                    has_active_subscription = True
            except Subscription.DoesNotExist:
                pass
            
            if not has_active_subscription:
                logger.info(f"Subscription expired for user {user.email}, unpublishing projects")
                
                # Unpublish all projects
                published_projects = user.projects.filter(is_published=True)
                count = published_projects.count()
                published_projects.update(is_published=False)
                
                # Update user status
                user.hosting_enabled = False
                user.hosting_enabled_until = None
                user.save()
                
                logger.info(f"Unpublished {count} projects for user {user.email}")
        
        # Also check subscriptions directly
        expired_subscriptions = Subscription.objects.filter(
            status=Subscription.Status.ACTIVE,
            current_period_end__lt=now
        )
        
        for subscription in expired_subscriptions:
            logger.info(f"Subscription {subscription.stripe_subscription_id} expired, updating status")
            subscription.status = Subscription.Status.CANCELED
            subscription.save()
            
            # Unpublish user's projects
            user = subscription.user
            published_projects = user.projects.filter(is_published=True)
            count = published_projects.count()
            published_projects.update(is_published=False)
            
            user.hosting_enabled = False
            user.hosting_enabled_until = None
            user.save()
            
            logger.info(f"Unpublished {count} projects for user {user.email}")
        
        return f"Checked subscriptions, found {expired_users.count()} expired users"
    
    except Exception as e:
        logger.error(f"Error checking expired subscriptions: {e}", exc_info=True)
        raise

