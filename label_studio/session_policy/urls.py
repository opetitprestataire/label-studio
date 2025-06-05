from django.urls import path

from .api import SessionTimeoutPolicyView

urlpatterns = [
    path('api/session-policy/', SessionTimeoutPolicyView.as_view(), name='session-policy'),
]
