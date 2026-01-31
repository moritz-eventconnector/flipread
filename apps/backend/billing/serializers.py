from rest_framework import serializers
from .models import Payment, Subscription


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            'id', 'payment_type', 'amount', 'currency', 'status',
            'created_at', 'completed_at'
        )
        read_only_fields = ('id', 'status', 'created_at', 'completed_at')


class SubscriptionSerializer(serializers.ModelSerializer):
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = Subscription
        fields = (
            'id', 'status', 'current_period_start', 'current_period_end',
            'cancel_at_period_end', 'is_active', 'created_at'
        )
        read_only_fields = ('id', 'status', 'current_period_start', 'current_period_end', 'created_at')


