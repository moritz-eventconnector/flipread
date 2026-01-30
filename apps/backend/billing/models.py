"""
Billing Models for Stripe Integration
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from accounts.models import User
from projects.models import Project


class StripeCustomer(models.Model):
    """Stripe Customer linked to User"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='stripe_customer')
    stripe_customer_id = models.CharField(max_length=255, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'stripe_customers'
    
    def __str__(self):
        return f"{self.user.email} - {self.stripe_customer_id}"


class Payment(models.Model):
    """Payment records"""
    
    class PaymentType(models.TextChoices):
        DOWNLOAD = 'download', 'Download'
        HOSTING = 'hosting', 'Hosting'
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    payment_type = models.CharField(max_length=20, choices=PaymentType.choices)
    
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, db_index=True)
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['stripe_payment_intent_id']),
            models.Index(fields=['stripe_checkout_session_id']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.payment_type} - {self.amount} {self.currency}"


class Subscription(models.Model):
    """Hosting Subscription"""
    
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        CANCELED = 'canceled', 'Canceled'
        PAST_DUE = 'past_due', 'Past Due'
        UNPAID = 'unpaid', 'Unpaid'
        INCOMPLETE = 'incomplete', 'Incomplete'
        TRIALING = 'trialing', 'Trialing'
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    stripe_subscription_id = models.CharField(max_length=255, unique=True, db_index=True)
    stripe_price_id = models.CharField(max_length=255)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INCOMPLETE)
    
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    canceled_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'subscriptions'
    
    def __str__(self):
        return f"{self.user.email} - {self.status}"
    
    @property
    def is_active(self):
        """Check if subscription is currently active"""
        return self.status == self.Status.ACTIVE and (
            not self.current_period_end or self.current_period_end > timezone.now()
        )


class WebhookEvent(models.Model):
    """Stripe webhook events log"""
    stripe_event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=100)
    processed = models.BooleanField(default=False)
    data = models.JSONField()
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'webhook_events'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.event_type} - {self.stripe_event_id}"

