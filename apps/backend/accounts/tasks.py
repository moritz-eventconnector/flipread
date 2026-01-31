"""
Celery tasks for accounts app
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_verification_email(user_id, token):
    """Send email verification email asynchronously"""
    try:
        from .models import User
        user = User.objects.get(id=user_id)
        
        verification_url = f"{settings.SITE_URL}/app/verify-email?token={token}"
        
        # Render HTML email template
        from django.utils import timezone
        html_message = render_to_string('emails/email_verification.html', {
            'verification_url': verification_url,
            'current_year': timezone.now().year,
        })
        
        plain_message = f"""Hallo,

vielen Dank für Ihre Registrierung bei FlipRead!

Bitte klicken Sie auf den folgenden Link, um Ihre Email-Adresse zu verifizieren:
{verification_url}

Dieser Link ist 24 Stunden gültig.

Falls Sie sich nicht registriert haben, können Sie diese Email ignorieren.

Mit freundlichen Grüßen,
Ihr FlipRead Team
"""
        
        send_mail(
            subject='Email-Verifizierung - FlipRead',
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info(f"Verification email sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send verification email to user {user_id}: {e}", exc_info=True)
        raise

