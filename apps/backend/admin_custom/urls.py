from django.urls import path
from .views import (
    dashboard_stats, toggle_user_active, toggle_hosting,
    toggle_project_download, toggle_project_publish
)

urlpatterns = [
    path('stats/', dashboard_stats, name='admin_stats'),
    path('users/<int:user_id>/toggle-active/', toggle_user_active, name='toggle_user_active'),
    path('users/<int:user_id>/toggle-hosting/', toggle_hosting, name='toggle_hosting'),
    path('projects/<int:project_id>/toggle-download/', toggle_project_download, name='toggle_project_download'),
    path('projects/<int:project_id>/toggle-publish/', toggle_project_publish, name='toggle_project_publish'),
]


