"""
Custom Admin Views
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone

from accounts.models import User
from projects.models import Project
from billing.models import StripeCustomer, Payment, Subscription


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    """Admin dashboard statistics"""
    if not request.user.is_admin:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    stats = {
        'users': {
            'total': User.objects.count(),
            'active': User.objects.filter(is_active=True).count(),
            'with_hosting': User.objects.filter(hosting_enabled=True).count(),
        },
        'projects': {
            'total': Project.objects.count(),
            'ready': Project.objects.filter(status=Project.Status.READY).count(),
            'published': Project.objects.filter(is_published=True).count(),
        },
        'billing': {
            'total_payments': Payment.objects.filter(status=Payment.Status.COMPLETED).count(),
            'active_subscriptions': Subscription.objects.filter(status=Subscription.Status.ACTIVE).count(),
            'stripe_customers': StripeCustomer.objects.count(),
        }
    }
    
    return Response(stats)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_user_active(request, user_id):
    """Toggle user active status"""
    if not request.user.is_admin:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        user = User.objects.get(id=user_id)
        user.is_active = not user.is_active
        user.save()
        return Response({'message': f'User {"activated" if user.is_active else "deactivated"}'})
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_hosting(request, user_id):
    """Toggle hosting for user"""
    if not request.user.is_admin:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        user = User.objects.get(id=user_id)
        user.hosting_enabled = not user.hosting_enabled
        if user.hosting_enabled:
            # Set expiration to 1 year from now if not set
            if not user.hosting_enabled_until:
                from datetime import timedelta
                user.hosting_enabled_until = timezone.now() + timedelta(days=365)
        else:
            user.hosting_enabled_until = None
            # Unpublish all projects
            user.projects.filter(is_published=True).update(is_published=False)
        user.save()
        return Response({'message': f'Hosting {"enabled" if user.hosting_enabled else "disabled"}'})
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_project_download(request, project_id):
    """Toggle download for project"""
    if not request.user.is_admin:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        project = Project.objects.get(id=project_id)
        project.download_enabled = not project.download_enabled
        project.save()
        return Response({'message': f'Download {"enabled" if project.download_enabled else "disabled"}'})
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_project_publish(request, project_id):
    """Toggle publish for project"""
    if not request.user.is_admin:
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        project = Project.objects.get(id=project_id)
        project.is_published = not project.is_published
        if project.is_published:
            project.published_at = timezone.now()
        project.save()
        return Response({'message': f'Publish {"enabled" if project.is_published else "disabled"}'})
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

