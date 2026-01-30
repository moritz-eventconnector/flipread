from django.urls import path
from .views import checkout_download, checkout_hosting, billing_portal, webhook

urlpatterns = [
    path('checkout/download/', checkout_download, name='checkout_download'),
    path('checkout/hosting/', checkout_hosting, name='checkout_hosting'),
    path('portal/', billing_portal, name='billing_portal'),
    path('webhook/', webhook, name='webhook'),
]

