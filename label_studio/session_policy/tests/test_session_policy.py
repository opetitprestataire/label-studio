import pytest
from organizations.tests.factories import OrganizationFactory
from projects.tests.factories import ProjectFactory
from rest_framework import status
from rest_framework.test import APIClient
from session_policy.models import SessionTimeoutPolicy
from tests.utils import mock_feature_flag


@pytest.mark.django_db
@mock_feature_flag(flag_name='fflag_feat_utc_46_session_timeout_policy', value=True)
def test_session_timeout_policy():
    # Create organization and project
    organization = OrganizationFactory()

    # Create API client and perform actual login
    client = APIClient()
    user = organization.created_by
    user.set_password('testpass123')
    user.save()

    # Login to create a session
    response = client.post('/user/login/', {'email': user.email, 'password': 'testpass123'})
    assert response.status_code == status.HTTP_302_FOUND

    # First API call should succeed
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_200_OK

    # Get or create session timeout policy with 0 hours
    # We need to access the organization's session_timeout_policy field to trigger AutoOneToOneField
    # The first request should be triggering this in middleware anyway, but can behave differently in parallelized test execution
    _ = organization.session_timeout_policy
    timeout_policy = SessionTimeoutPolicy.objects.get(organization=organization)
    timeout_policy.max_session_age = 0
    timeout_policy.max_time_between_activity = 0
    timeout_policy.save()

    # Next API call should fail due to session timeout
    response = client.get('/api/projects/')
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
