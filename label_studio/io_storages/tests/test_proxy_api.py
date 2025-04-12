import base64
import io
import unittest
from unittest.mock import MagicMock, patch

import pytest
from django.test import RequestFactory
from django.urls import reverse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate

from io_storages.proxy_api import (
    ProjectResolveStorageUri,
    ResolveStorageUriAPIMixin,
    TaskResolveStorageUri,
)
from projects.models import Project
from tasks.models import Task
from users.models import User


class TestResolveStorageUriAPIMixin(unittest.TestCase):
    def setUp(self):
        self.mixin = ResolveStorageUriAPIMixin()
        self.user = MagicMock()
        self.project = MagicMock()
        self.task = MagicMock()
        self.task.project = self.project
        # Set the __class__.__name__ to "Task" for type checks
        type(self.task).__name__ = "Task"
        self.task.has_permission.return_value = True
        self.request = MagicMock()
        self.request.user = self.user
        self.storage = MagicMock()
        self.storage.presign = True

    def test_resolve_with_permission_denied(self):
        self.task.has_permission.return_value = False
        result = self.mixin.resolve(self.request, "test_fileuri", self.task)
        assert result.status_code == status.HTTP_403_FORBIDDEN

    @patch("io_storages.proxy_api.flag_set")
    @patch("io_storages.proxy_api.get_storage_by_url")
    def test_resolve_with_base64_decoding(self, mock_get_storage, mock_flag_set):
        mock_flag_set.return_value = True
        mock_get_storage.return_value = self.storage
        fileuri = base64.urlsafe_b64encode(b"test_uri").decode()
        
        with patch.object(self.mixin, 'redirect_to_presign_url') as mock_redirect:
            mock_redirect.return_value = Response()
            self.mixin.resolve(self.request, fileuri, self.task)
            mock_redirect.assert_called_once_with("test_uri", self.task, "Task")
    
    @patch("io_storages.proxy_api.flag_set")
    @patch("io_storages.proxy_api.get_storage_by_url")
    def test_resolve_with_url_unquote_fallback(self, mock_get_storage, mock_flag_set):
        mock_flag_set.return_value = True
        mock_get_storage.return_value = self.storage
        
        with patch.object(self.mixin, 'redirect_to_presign_url') as mock_redirect:
            mock_redirect.return_value = Response()
            # Non-base64 uri to trigger fallback
            self.mixin.resolve(self.request, "s3://bucket/file.jpg", self.task)
            mock_redirect.assert_called_once_with("s3://bucket/file.jpg", self.task, "Task")
    
    @patch("io_storages.proxy_api.flag_set")
    @patch("io_storages.proxy_api.get_storage_by_url")
    def test_resolve_storage_not_found(self, mock_get_storage, mock_flag_set):
        mock_flag_set.return_value = True
        mock_get_storage.return_value = None
        result = self.mixin.resolve(self.request, "fileuri", self.task)
        assert result.status_code == status.HTTP_404_NOT_FOUND
    
    @patch("io_storages.proxy_api.flag_set")
    @patch("io_storages.proxy_api.get_storage_by_url")
    def test_resolve_storage_no_presign_support(self, mock_get_storage, mock_flag_set):
        mock_flag_set.return_value = True
        mock_storage = MagicMock()
        delattr(mock_storage, 'presign')
        mock_get_storage.return_value = mock_storage
        result = self.mixin.resolve(self.request, "fileuri", self.task)
        assert result.status_code == status.HTTP_404_NOT_FOUND
    
    @patch("io_storages.proxy_api.flag_set")
    @patch("io_storages.proxy_api.get_storage_by_url")
    def test_resolve_with_presign_true(self, mock_get_storage, mock_flag_set):
        mock_flag_set.return_value = True
        mock_storage = MagicMock()
        mock_storage.presign = True
        mock_get_storage.return_value = mock_storage
        
        with patch.object(self.mixin, 'redirect_to_presign_url') as mock_redirect:
            mock_redirect.return_value = Response()
            self.mixin.resolve(self.request, "fileuri", self.task)
            mock_redirect.assert_called_once()
    
    @patch("io_storages.proxy_api.flag_set")
    @patch("io_storages.proxy_api.get_storage_by_url")
    def test_resolve_with_presign_false(self, mock_get_storage, mock_flag_set):
        mock_flag_set.return_value = True
        mock_storage = MagicMock()
        mock_storage.presign = False
        mock_get_storage.return_value = mock_storage
        
        with patch.object(self.mixin, 'proxy_data_from_storage') as mock_proxy:
            mock_proxy.return_value = Response()
            self.mixin.resolve(self.request, "fileuri", self.task)
            mock_proxy.assert_called_once_with(self.request, "fileuri", mock_storage)
    
    def test_redirect_to_presign_url_success(self):
        self.task.resolve_storage_uri.return_value = {'url': 'https://example.com/file.jpg', 'presign_ttl': 60}
        result = self.mixin.redirect_to_presign_url("fileuri", self.task, "Task")
        
        assert result.status_code == status.HTTP_303_SEE_OTHER
        assert result.url == 'https://example.com/file.jpg'
        assert result.headers['Cache-Control'] == 'no-store, max-age=3600'
    
    def test_redirect_to_presign_url_no_url(self):
        self.task.resolve_storage_uri.return_value = {'url': None}
        result = self.mixin.redirect_to_presign_url("fileuri", self.task, "Task")
        assert result.status_code == status.HTTP_404_NOT_FOUND
    
    def test_redirect_to_presign_url_exception(self):
        self.task.resolve_storage_uri.side_effect = Exception("Error resolving URL")
        result = self.mixin.redirect_to_presign_url("fileuri", self.task, "Task")
        assert result.status_code == status.HTTP_404_NOT_FOUND
    
    def test_proxy_data_from_storage_success(self):
        mock_storage = MagicMock()
        mock_storage.get_bytes_stream.return_value = (io.BytesIO(b"test data"), "image/jpeg")
        
        with patch("io_storages.proxy_api.RangedFileResponse") as mock_response:
            mock_response.return_value = "mocked response"
            result = self.mixin.proxy_data_from_storage(self.request, "uri", mock_storage)
            
            mock_storage.get_bytes_stream.assert_called_once_with("uri")
            mock_response.assert_called_once()
            assert result == "mocked response"
    
    def test_proxy_data_from_storage_no_data(self):
        mock_storage = MagicMock()
        mock_storage.get_bytes_stream.return_value = (None, None)
        
        result = self.mixin.proxy_data_from_storage(self.request, "uri", mock_storage)
        assert result.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    
    def test_proxy_data_from_storage_exception(self):
        mock_storage = MagicMock()
        mock_storage.get_bytes_stream.side_effect = Exception("Storage error")
        
        result = self.mixin.proxy_data_from_storage(self.request, "uri", mock_storage)
        assert result.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestTaskResolveStorageUri:
    @pytest.fixture
    def setup(self):
        # Create the necessary objects for testing without database
        self.factory = APIRequestFactory()
        self.user = MagicMock()
        self.task = MagicMock(spec=Task)
        self.view = TaskResolveStorageUri.as_view()
    
    @patch('io_storages.proxy_api.Task.objects.get')
    def test_get_with_missing_params(self, mock_task_get, setup):
        # Mock the database query
        mock_task_get.return_value = self.task
        
        # Test missing fileuri parameter
        request = self.factory.get('/task/1/resolve/')
        force_authenticate(request, user=self.user)
        response = self.view(request, task_id=1)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Test missing task_id parameter
        request = self.factory.get('/task/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    @patch('io_storages.proxy_api.Task.objects.get')
    def test_get_task_not_found(self, mock_task_get, setup):
        # Mock the database query to raise DoesNotExist
        mock_task_get.side_effect = Task.DoesNotExist
        
        request = self.factory.get('/task/999/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request, task_id=999)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @patch('io_storages.proxy_api.Task.objects.get')
    @patch.object(ResolveStorageUriAPIMixin, 'resolve')
    def test_get_success(self, mock_resolve, mock_task_get, setup):
        # Mock the database query and resolve method
        mock_task_get.return_value = self.task
        mock_resolve.return_value = Response(status=status.HTTP_200_OK)
        
        request = self.factory.get('/task/1/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request, task_id=1)
        
        mock_task_get.assert_called_once_with(pk=1)
        # Use any_call instead of assert_called_once_with to handle DRF request vs WSGIRequest
        assert mock_resolve.call_args is not None
        assert mock_resolve.call_args[0][1] == 'test'
        assert mock_resolve.call_args[0][2] == self.task
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestProjectResolveStorageUri:
    @pytest.fixture
    def setup(self):
        # Create the necessary objects for testing without database
        self.factory = APIRequestFactory()
        self.user = MagicMock()
        self.project = MagicMock()  # Avoid using spec=Project - it triggers database access
        self.view = ProjectResolveStorageUri.as_view()
    
    @patch('io_storages.proxy_api.Project.objects.get')
    def test_get_with_missing_params(self, mock_project_get, setup):
        # Mock the database query
        mock_project_get.return_value = self.project
        
        # Test missing fileuri parameter
        request = self.factory.get('/project/1/resolve/')
        force_authenticate(request, user=self.user)
        response = self.view(request, project_id=1)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Test missing project_id parameter
        request = self.factory.get('/project/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    @patch('io_storages.proxy_api.Project.objects.get')
    def test_get_project_not_found(self, mock_project_get, setup):
        # Mock the database query to raise DoesNotExist
        mock_project_get.side_effect = Project.DoesNotExist
        
        request = self.factory.get('/project/999/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request, project_id=999)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @patch('io_storages.proxy_api.Project.objects.get')
    @patch.object(ResolveStorageUriAPIMixin, 'resolve')
    def test_get_success(self, mock_resolve, mock_project_get, setup):
        # Mock the database query and resolve method
        mock_project_get.return_value = self.project
        mock_resolve.return_value = Response(status=status.HTTP_200_OK)
        
        request = self.factory.get('/project/1/resolve/?fileuri=test')
        force_authenticate(request, user=self.user)
        response = self.view(request, project_id=1)
        
        mock_project_get.assert_called_once_with(pk=1)
        # Use any_call instead of assert_called_once_with to handle DRF request vs WSGIRequest
        assert mock_resolve.call_args is not None
        assert mock_resolve.call_args[0][1] == 'test'
        assert mock_resolve.call_args[0][2] == self.project
        assert response.status_code == status.HTTP_200_OK 