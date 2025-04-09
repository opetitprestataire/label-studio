import base64
import json
import logging
import mimetypes
import time
import io
from typing import Union
from urllib.parse import unquote, urlparse

from django.http import HttpRequest, HttpResponseRedirect
from drf_yasg.utils import swagger_auto_schema
from projects.models import Project
from ranged_fileresponse import RangedFileResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from tasks.models import Task

from label_studio.io_storages.functions import get_storage_by_url


logger = logging.getLogger(__name__)


class ResolveStorageUriAPIMixin:
    def resolve(self, request: HttpRequest, fileuri: str, instance: Union[Task, Project]) -> Response:
        model_name = type(instance).__name__

        if not instance.has_permission(request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)

        # Attempt to base64 decode the fileuri
        try:
            fileuri = base64.urlsafe_b64decode(fileuri.encode()).decode()
        # For backwards compatibility, try unquote if this fails
        except Exception as exc:
            logger.debug(
                f'Failed to decode base64 {fileuri} for {model_name} {instance.id}: {exc} falling back to unquote'
            )
            fileuri = unquote(fileuri)

        # Try to find storage by URL
        project = instance if isinstance(instance, Project) else instance.project
        storage_objects = project.get_all_import_storage_objects
        storage = get_storage_by_url(fileuri, storage_objects)
        if not storage:
            logger.error(f'Could not find storage for URI {fileuri}')
            return Response(status=status.HTTP_404_NOT_FOUND)
        # Not all storages support presigned URLs
        if not hasattr(storage, 'presign'):
            logger.error(f'Storage {storage} does not support presign URLs')
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Check if storage should use presigned URLs;
        # It's important to have this check here, because it increases security:
        # If storage.presign is False, it means an admin doesn't want to expose presigned URLs anyhow,
        # and all files are proxied through Label Studio using LS auth and RBAC control.  
        
        if storage.presign:
            # Redirect to presigned URL (original flow)
            return self.redirect_to_presign_url(fileuri, instance, model_name)
        else:
            # Direct proxy from storage
            return self.proxy_data_from_storage(request, fileuri, storage)
            
    def redirect_to_presign_url(
        self, 
        fileuri: str, 
        instance: Union[Task, Project], 
        model_name: str
    ) -> Response:
        """Generate and redirect to a presigned URL for the given file URI"""
        try:
            resolved = instance.resolve_storage_uri(fileuri)
        except Exception as exc:
            logger.error(f'Failed to resolve storage uri {fileuri} for {model_name} {instance.id}: {exc}')
            return Response(status=status.HTTP_404_NOT_FOUND)

        if resolved is None or resolved.get('url') is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        url = resolved['url']
        max_age = 0
        if resolved.get('presign_ttl'):
            max_age = resolved.get('presign_ttl') * 60

        # Proxy to presigned url
        response = HttpResponseRedirect(redirect_to=url, status=status.HTTP_303_SEE_OTHER)
        response.headers['Cache-Control'] = f'no-store, max-age={max_age}'

        return response
            
    def proxy_data_from_storage(self, request, uri, storage):
        """Proxy the data directly from storage without redirecting"""
        try:
            # Use the storage-specific method to get data stream and content type
            data, content_type = storage.get_bytes_stream(uri)
            
            # If we have the data and content type, return the response
            if data is not None:
                content_type = content_type or 'application/octet-stream'
                return RangedFileResponse(request, data, content_type=content_type)
            else:
                logger.error(f'Failed to get data from storage {storage}')
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"Error proxying data from storage: {e}", exc_info=True)
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TaskResolveStorageUri(ResolveStorageUriAPIMixin, APIView):
    """A file proxy to presign storage urls at the task level.
    
    If the storage has presign=False, it will proxy the data through Label Studio
    instead of redirecting to presigned URLs.
    """

    swagger_schema = None
    http_method_names = ['get']
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        """Get the presigned url for a given fileuri or proxy data through Label Studio"""
        request = self.request
        task_id = kwargs.get('task_id')
        fileuri = request.GET.get('fileuri')

        if fileuri is None or task_id is None:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            task = Task.objects.get(pk=task_id)
        except Task.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return self.resolve(request, fileuri, task)


class ProjectResolveStorageUri(ResolveStorageUriAPIMixin, APIView):
    """A file proxy to presign storage urls at the project level.
    
    If the storage has presign=False, it will proxy the data through Label Studio
    instead of redirecting to presigned URLs.
    """

    swagger_schema = None
    http_method_names = ['get']
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        """Get the presigned url for a given fileuri or proxy data through Label Studio"""
        request = self.request
        project_id = kwargs.get('project_id')
        fileuri = request.GET.get('fileuri')

        if fileuri is None or project_id is None:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        return self.resolve(request, fileuri, project)
