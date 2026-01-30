"""
Authentication Views - AUTHENTIK READY

Diese Views können später durch Authentik OAuth/OIDC ersetzt werden.
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
import secrets
from datetime import timedelta

from .serializers import (
    UserSerializer, RegisterSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from .models import PasswordResetToken, LoginCode, EmailVerificationToken
from django.template.loader import render_to_string

User = get_user_model()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'ok', 'service': 'flipread-api'})


class RegisterView(generics.CreateAPIView):
    """User registration - AUTHENTIK READY"""
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Email verification if enabled
        if settings.ENABLE_EMAIL_VERIFICATION:
            token = secrets.token_urlsafe(32)
            expires_at = timezone.now() + timedelta(hours=24)
            
            # Create verification token
            EmailVerificationToken.objects.create(
                user=user,
                token=token,
                expires_at=expires_at
            )
            
            verification_url = f"{settings.SITE_URL}/app/verify-email?token={token}"
            
            # Render HTML email template
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
        else:
            user.is_email_verified = True
            user.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    """Login view with 2FA - AUTHENTIK READY (kann durch OAuth/OIDC ersetzt werden)"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        code = request.data.get('code')  # 2FA code
        
        if not email or not password:
            return Response(
                {'error': 'Email and password required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.check_password(password):
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # If code is provided, verify it
        if code:
            try:
                login_code = LoginCode.objects.get(
                    user=user,
                    code=code,
                    used=False,
                    expires_at__gt=timezone.now()
                )
                login_code.used = True
                login_code.save()
            except LoginCode.DoesNotExist:
                return Response(
                    {'error': 'Invalid or expired code'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Code verified, generate tokens
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            })
        
        # 2FA per Email is always enabled for all users
        if settings.ENABLE_2FA_EMAIL:
            # No code provided, send 2FA code via email
            # Invalidate old codes
            LoginCode.objects.filter(user=user, used=False).update(used=True)
            
            # Generate new code (expires_at will be set to 15 minutes by model's save method)
            login_code = LoginCode.objects.create(
                user=user,
                code=LoginCode.generate_code(),
                ip_address=request.META.get('REMOTE_ADDR')
            )
            
            # Render HTML email template
            try:
                html_message = render_to_string('emails/login_code.html', {
                    'user': user,
                    'code': login_code.code,  # Template uses 'code', not 'login_code'
                    'login_code': login_code.code,  # Also provide for compatibility
                    'validity_minutes': 15,
                    'site_name': 'FlipRead',
                    'current_year': timezone.now().year,
                })
            except Exception:
                html_message = None
            
            plain_message = f"""Hallo,

Sie haben versucht, sich bei FlipRead anzumelden.

Ihr Anmelde-Code lautet: {login_code.code}

Geben Sie diesen 6-stelligen Code auf der Anmeldeseite ein.

Dieser Code ist 15 Minuten gültig.

Falls Sie sich nicht angemeldet haben, ignorieren Sie diese Email bitte.

Mit freundlichen Grüßen,
Ihr FlipRead Team
"""
            
            # Send email - this is required for 2FA
            try:
                # Check if email is configured
                if not settings.EMAIL_HOST:
                    raise ValueError("EMAIL_HOST is not configured")
                if not settings.EMAIL_HOST_USER:
                    raise ValueError("EMAIL_HOST_USER is not configured")
                
                send_mail(
                    subject='Ihr FlipRead Login-Code',
                    message=plain_message,
                    html_message=html_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                # Log success
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"2FA login code sent successfully to {user.email}")
            except Exception as e:
                # Log the error with full details
                import logging
                import traceback
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send login code email to {user.email}: {str(e)}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                logger.error(f"Email config - HOST: {settings.EMAIL_HOST or 'NOT SET'}, PORT: {settings.EMAIL_PORT}, USER: {settings.EMAIL_HOST_USER or 'NOT SET'}, USE_TLS: {settings.EMAIL_USE_TLS}, USE_SSL: {getattr(settings, 'EMAIL_USE_SSL', False)}")
                # Return detailed error for debugging
                error_response = {
                    'error': f'Failed to send login code email: {str(e)}. Please check email configuration.',
                    'requires_code': True,
                }
                if settings.DEBUG:
                    error_response['debug'] = {
                        'email_host': settings.EMAIL_HOST or 'NOT SET',
                        'email_port': settings.EMAIL_PORT,
                        'email_user': settings.EMAIL_HOST_USER or 'NOT SET',
                        'email_use_tls': settings.EMAIL_USE_TLS,
                        'email_use_ssl': getattr(settings, 'EMAIL_USE_SSL', False),
                        'from_email': settings.DEFAULT_FROM_EMAIL,
                    }
                return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'message': '2FA code sent to your email.',
                'requires_code': True
            }, status=status.HTTP_202_ACCEPTED)
        
        # No 2FA required, generate tokens directly
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class UserProfileView(generics.RetrieveUpdateAPIView):
    """User profile"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class PasswordResetRequestView(generics.GenericAPIView):
    """Request password reset"""
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetRequestSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            # Don't reveal if user exists
            return Response({'message': 'If the email exists, a reset link has been sent.'})
        
        # Create reset token
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=24)
        
        PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
        
        # Send email
        reset_url = f"{settings.SITE_URL}/app/reset-password?token={token}"
        send_mail(
            subject='Passwort zurücksetzen - FlipRead',
            message=f'Klicken Sie auf diesen Link zum Zurücksetzen: {reset_url}',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        
        return Response({'message': 'If the email exists, a reset link has been sent.'})


class PasswordResetConfirmView(generics.GenericAPIView):
    """Confirm password reset"""
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetConfirmSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        try:
            reset_token = PasswordResetToken.objects.get(
                token=token,
                used=False,
                expires_at__gt=timezone.now()
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update password
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Mark token as used
        reset_token.used = True
        reset_token.save()
        
        return Response({'message': 'Password has been reset successfully.'})


class EmailVerificationView(generics.GenericAPIView):
    """Verify email address"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response(
                {'error': 'Token required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            verification_token = EmailVerificationToken.objects.get(
                token=token,
                used=False,
                expires_at__gt=timezone.now()
            )
            user = verification_token.user
            user.is_email_verified = True
            user.save()
            
            # Mark token as used
            verification_token.used = True
            verification_token.save()
            
            return Response({'message': 'Email verified successfully.'})
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ResendVerificationView(generics.GenericAPIView):
    """Resend email verification"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Check if already verified
        if user.is_email_verified:
            return Response(
                {'error': 'Email is already verified'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate new token (24 hours validity)
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=24)
        
        # Invalidate old tokens
        EmailVerificationToken.objects.filter(user=user, used=False).update(used=True)
        
        # Create new verification token
        EmailVerificationToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )
        
        # Send verification email
        verification_url = f"{settings.SITE_URL}/app/verify-email?token={token}"
        
        # Render HTML email template
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
        
        return Response({'message': 'Verification email sent successfully.'})

