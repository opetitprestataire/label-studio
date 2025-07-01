"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""
from django.utils.decorators import method_decorator
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from io_storages.api import (
    ExportStorageDetailAPI,
    ExportStorageFormLayoutAPI,
    ExportStorageListAPI,
    ExportStorageSyncAPI,
    ExportStorageValidateAPI,
    ImportStorageDetailAPI,
    ImportStorageFormLayoutAPI,
    ImportStorageListAPI,
    ImportStorageValidateAPI,
)
from io_storages.redis.models import RedisExportStorage, RedisImportStorage
from io_storages.redis.serializers import RedisExportStorageSerializer, RedisImportStorageSerializer

from .openapi_schema import (
    _redis_export_storage_schema,
    _redis_export_storage_schema_with_id,
    _redis_import_storage_schema,
    _redis_import_storage_schema_with_id,
)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Get all import storage',
        description='Get a list of all Redis import storage connections.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
            ),
        ],
        request=None,
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Create import storage',
        description='Create a new Redis import storage connection.',
        request=_redis_import_storage_schema,
    ),
)
class RedisImportStorageListAPI(ImportStorageListAPI):
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Get import storage',
        description='Get a specific Redis import storage connection.',
        request=None,
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Update import storage',
        description='Update a specific Redis import storage connection.',
        request=_redis_import_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Delete import storage',
        description='Delete a specific Redis import storage connection.',
        request=None,
    ),
)
class RedisImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = RedisImportStorage.objects.all()
    serializer_class = RedisImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Sync import storage',
        description='Sync tasks from a specific Redis import storage connection.',
        parameters=[
            OpenApiParameter(
                name='id',
                type=OpenApiTypes.INT,
                location='path',
                description='Storage ID',
            ),
        ],
        request=None,
    ),
)
class RedisImportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = RedisImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Sync export storage',
        description='Sync tasks from a specific Redis export storage connection.',
        request=None,
    ),
)
class RedisExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = RedisExportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Validate import storage',
        description='Validate a specific Redis import storage connection.',
        request=_redis_import_storage_schema_with_id,
        responses={200: OpenApiResponse(description='Validation successful')},
    ),
)
class RedisImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = RedisImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Validate export storage',
        description='Validate a specific Redis export storage connection.',
        request=_redis_export_storage_schema_with_id,
        responses={200: OpenApiResponse(description='Validation successful')},
    ),
)
class RedisExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = RedisExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Get all export storage',
        description='Get a list of all Redis export storage connections.',
        parameters=[
            OpenApiParameter(
                name='project',
                type=OpenApiTypes.INT,
                location='query',
                description='Project ID',
            ),
        ],
        request=None,
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Create export storage',
        description='Create a new Redis export storage connection to store annotations.',
        request=_redis_export_storage_schema,
    ),
)
class RedisExportStorageListAPI(ExportStorageListAPI):
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Get export storage',
        description='Get a specific Redis export storage connection.',
        request=None,
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Update export storage',
        description='Update a specific Redis export storage connection.',
        request=_redis_export_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: Redis', 'redis'],
        summary='Delete export storage',
        description='Delete a specific Redis export storage connection.',
        request=None,
    ),
)
class RedisExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = RedisExportStorage.objects.all()
    serializer_class = RedisExportStorageSerializer


class RedisImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class RedisExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
