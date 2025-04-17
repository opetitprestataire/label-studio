import base64
import logging
import socket
from typing import Union
from urllib.parse import unquote

from core.feature_flags import flag_set
from django.conf import settings
from django.http import HttpRequest, HttpResponseRedirect, StreamingHttpResponse
from projects.models import Project
from ranged_fileresponse import RangedFileResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from tasks.models import Task

from label_studio.io_storages.functions import get_storage_by_url

logger = logging.getLogger(__name__)


class TimeoutRangedFileResponse(RangedFileResponse):
    """
    RangedFileResponse with configurable timeout and buffer size to prevent
    worker blocking indefinitely during streaming responses.
    """

    def __init__(self, request, file_obj, content_type=None, buffer_size=8192, timeout=20):
        # Initialize attributes before calling super().__init__
        self._timeout = timeout
        self._buffer_size = buffer_size

        # Call parent initialization with block_size
        super().__init__(request, file_obj, content_type, block_size=self._buffer_size)

        # Apply timeout wrapper after parent initializes streaming
        if hasattr(self, '_streaming_content') and self._timeout:
            self._streaming_content = self._timeout_wrapper(self._streaming_content)

        # Set socket timeout if possible
        try:
            file_obj.fileno()
            socket_obj = (
                file_obj.raw.connection if hasattr(file_obj, 'raw') and hasattr(file_obj.raw, 'connection') else None
            )
            if socket_obj:
                socket_obj.settimeout(self._timeout)
        except (AttributeError, ValueError, IOError):
            # Not all file objects will have fileno() or a socket connection
            pass

    def _timeout_wrapper(self, iterator):
        """Wrap the iterator with timeout handling"""
        try:
            for chunk in iterator:
                yield chunk
        except socket.timeout:
            logger.warning(f'Socket timeout after {self._timeout}s while streaming response')
        except ConnectionError as e:
            logger.warning(f'Connection error while streaming response: {e}')
        except Exception as e:
            logger.error(f'Error during streaming response: {e}', exc_info=True)


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
        project = None
        if flag_set('fflag_optic_all_optic_1938_storage_proxy', user='auto'):
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
            presign = storage.presign
        else:
            presign = True

        # Check if storage should use presigned URLs;
        # It's important to have this check here, because it increases security:
        # If storage.presign is False, it means an admin doesn't want to expose presigned URLs anyhow,
        # and all files are proxied through Label Studio using LS auth and RBAC control.

        if presign:
            # Redirect to presigned URL (original flow)
            return self.redirect_to_presign_url(fileuri, instance, model_name)
        else:
            # Direct proxy from storage
            # Use flag or setting to choose the proxy implementation
            use_direct_stream = getattr(settings, 'USE_DIRECT_S3_STREAM', True)
            if use_direct_stream:
                return self.direct_proxy_data_from_storage(request, fileuri, project, storage)
            else:
                return self.proxy_data_from_storage(request, fileuri, project, storage)

    def redirect_to_presign_url(self, fileuri: str, instance: Union[Task, Project], model_name: str) -> Response:
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

    def proxy_data_from_storage(self, request, uri, project, storage):
        """Proxy the data directly from storage without redirecting"""
        try:
            # Extract range header if present and forward to S3
            range_header = request.headers.get('Range')
            
            # Use the storage-specific method to get data stream and content type
            data, content_type = storage.get_bytes_stream(uri, range_header=range_header)

            # If we have the data and content type, return the response
            if data is not None:
                content_type = content_type or 'application/octet-stream'

                # Use timeout enabled response with configurable buffer size
                buffer_size = getattr(settings, 'RESOLVER_PROXY_BUFFER_SIZE', 8192)
                timeout = getattr(settings, 'RESOLVER_PROXY_TIMEOUT', 300)

                response = TimeoutRangedFileResponse(
                    request, data, content_type=content_type, buffer_size=buffer_size, timeout=timeout
                )

                # Set cache control with moderate timeout
                max_age = settings.RESOLVER_PROXY_CACHE_TIMEOUT  # 1 hour cache

                # Generate an ETag based on user ID and user is_active status
                # This ensures cache is invalidated when user status changes
                user = request.user
                has_access = project.has_permission(user)
                user_status_tag = f'{user.id}:{has_access}'
                # "ETag" is a standard HTTP header defined in the HTTP/1.1 specification (RFC 7232).
                #  It stands for "Entity Tag" and is specifically designed for cache validation
                response.headers['ETag'] = f'"{hash(user_status_tag)}"'
                # Allow caching but require revalidation
                response.headers['Cache-Control'] = f'private, max-age={max_age}, must-revalidate'

                return response
            else:
                logger.error(f'Failed to get data from storage {storage}')
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.error(f'Error proxying data from storage: {e}', exc_info=True)
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    def direct_proxy_data_from_storage(self, request, uri, project, storage):
        """
        Proxy the data using iter_chunks directly without the S3StreamWrapper.
        
        This implementation forwards Range headers to S3 and streams the response
        directly using StreamingHttpResponse. It avoids any intermediate buffering
        but doesn't support backward seeking.
        """
        try:
            # Extract range header if present
            range_header = request.headers.get('Range')
            
            # Get direct stream and metadata from storage
            stream, content_type, metadata = storage.get_direct_stream(uri, range_header=range_header)
            
            if stream is None:
                logger.error(f'Failed to get direct stream from storage {storage}')
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create streaming response with proper chunk size
            chunk_size = getattr(settings, 'RESOLVER_PROXY_BUFFER_SIZE', 64*1024)
            
            # Set up streaming response with S3's status code
            status_code = metadata.get('StatusCode', 200)
            response = StreamingHttpResponse(
                stream.iter_chunks(chunk_size=chunk_size),
                content_type=content_type or 'application/octet-stream',
                status=status_code
            )
            
            # Copy important headers from S3
            if metadata.get('ETag'):
                response.headers['ETag'] = metadata['ETag']
            if metadata.get('ContentLength'):
                response.headers['Content-Length'] = str(metadata['ContentLength'])
            if metadata.get('ContentRange'):
                response.headers['Content-Range'] = metadata['ContentRange']
            if metadata.get('LastModified'):
                response.headers['Last-Modified'] = metadata['LastModified'].strftime('%a, %d %b %Y %H:%M:%S GMT')
            
            # Always enable range requests
            response.headers['Accept-Ranges'] = 'bytes'
            
            # Cache control
            max_age = settings.RESOLVER_PROXY_CACHE_TIMEOUT
            response.headers['Cache-Control'] = f'private, max-age={max_age}, must-revalidate'
            
            return response
            
        except Exception as e:
            logger.error(f'Error in direct proxy from storage: {e}', exc_info=True)
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
