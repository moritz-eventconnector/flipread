"""
URL configuration for flipread project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/billing/', include('billing.urls')),
    path('api/admin/', include('admin_custom.urls')),
    path('api/health/', include('accounts.urls')),  # Health check in accounts
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

