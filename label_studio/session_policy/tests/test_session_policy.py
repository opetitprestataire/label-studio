import pytest
from rest_framework import status
from rest_framework.test import APIClient

from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from session_policy.models import SessionTimeoutPolicy

from tests.utils import mock_feature_flag


@pytest.mark.django_db
@mock_feature_flag(flag_name='fflag_feat_utc_46_session_timeout_policy', value=True)
def test_session_timeout_policy():
    # Create organization and project
    organization = OrganizationFactory()
    project = ProjectFactory(organization=organization)
    
    # Create API client and perform actual login
    client = APIClient()
    user = organization.created_by
    user.set_password('testpass123')
    user.save()
    
    # Login to create a session
    response = client.post('/user/login/', {
        'email': user.email,
        'password': 'testpass123'
    })
    assert response.status_code == status.HTTP_302_FOUND
    
    # First API call should succeed
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_200_OK
    
    # Modify session timeout policy with 0 hours
    # Policy already exists since its an AutoOneToOneField
    timeout_policy = SessionTimeoutPolicy.objects.get(organization=organization)
    timeout_policy.max_session_age = 0
    timeout_policy.max_time_between_activity = 0
    timeout_policy.save()
    
    # Next API call should fail due to session timeout
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED 