from django.contrib import admin
from .models import StripeCustomer, Payment, Subscription, WebhookEvent


@admin.register(StripeCustomer)
class StripeCustomerAdmin(admin.ModelAdmin):
    list_display = ('user', 'stripe_customer_id', 'created_at')
    search_fields = ('user__email', 'stripe_customer_id')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'project', 'payment_type', 'amount', 'currency', 'status', 'created_at')
    list_filter = ('payment_type', 'status', 'created_at')
    search_fields = ('user__email', 'stripe_payment_intent_id', 'project__title')
    readonly_fields = ('created_at', 'completed_at')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'current_period_end', 'is_active', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__email', 'stripe_subscription_id')
    readonly_fields = ('created_at', 'updated_at', 'canceled_at')


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'stripe_event_id', 'processed', 'created_at')
    list_filter = ('processed', 'event_type', 'created_at')
    search_fields = ('stripe_event_id', 'event_type')
    readonly_fields = ('created_at',)

