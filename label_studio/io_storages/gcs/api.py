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
    ImportStorageSyncAPI,
    ImportStorageValidateAPI,
)
from io_storages.gcs.models import GCSExportStorage, GCSImportStorage
from io_storages.gcs.serializers import GCSExportStorageSerializer, GCSImportStorageSerializer

from .openapi_schema import (
    _gcs_export_storage_schema,
    _gcs_export_storage_schema_with_id,
    _gcs_import_storage_schema,
    _gcs_import_storage_schema_with_id,
)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Get all import storage',
        description='Get a list of all GCS import storage connections.',
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
        tags=['Storage: GCS', 'gcs'],
        summary='Create import storage',
        description='Create a new GCS import storage connection.',
        request=_gcs_import_storage_schema,
    ),
)
class GCSImportStorageListAPI(ImportStorageListAPI):
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Get import storage',
        description='Get a specific GCS import storage connection.',
        request=None,
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Update import storage',
        description='Update a specific GCS import storage connection.',
        request=_gcs_import_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Delete import storage',
        description='Delete a specific GCS import storage connection.',
        request=None,
    ),
)
class GCSImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = GCSImportStorage.objects.all()
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Sync import storage',
        description='Sync tasks from an GCS import storage connection.',
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
class GCSImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Sync export storage',
        description='Sync tasks from an GCS export storage connection.',
        request=None,
    ),
)
class GCSExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Validate import storage',
        description='Validate a specific GCS import storage connection.',
        request=_gcs_import_storage_schema_with_id,
        # expecting empty response
        responses={200: OpenApiResponse(description='OK')},
    ),
)
class GCSImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = GCSImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Validate export storage',
        description='Validate a specific GCS export storage connection.',
        request=_gcs_export_storage_schema_with_id,
        # expecting empty response
        responses={200: OpenApiResponse(description='OK')},
    ),
)
class GCSExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Get all export storage',
        description='Get a list of all GCS export storage connections.',
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
        tags=['Storage: GCS', 'gcs'],
        summary='Create export storage',
        description='Create a new GCS export storage connection to store annotations.',
        request=_gcs_export_storage_schema,
    ),
)
class GCSExportStorageListAPI(ExportStorageListAPI):
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Get export storage',
        description='Get a specific GCS export storage connection.',
        request=None,
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Update export storage',
        description='Update a specific GCS export storage connection.',
        request=_gcs_export_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: GCS', 'gcs'],
        summary='Delete export storage',
        description='Delete a specific GCS export storage connection.',
        request=None,
    ),
)
class GCSExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = GCSExportStorage.objects.all()
    serializer_class = GCSExportStorageSerializer


class GCSImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class GCSExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
