from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    health_check, RegisterView, LoginView, UserProfileView,
    PasswordResetRequestView, PasswordResetConfirmView, EmailVerificationView
)

urlpatterns = [
    path('health/', health_check, name='health'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('verify-email/', EmailVerificationView.as_view(), name='verify_email'),
]

