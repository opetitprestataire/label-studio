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
from io_storages.azure_blob.models import AzureBlobExportStorage, AzureBlobImportStorage
from io_storages.azure_blob.serializers import AzureBlobExportStorageSerializer, AzureBlobImportStorageSerializer

from .openapi_schema import (
    _azure_blob_export_storage_schema,
    _azure_blob_export_storage_schema_with_id,
    _azure_blob_import_storage_schema,
    _azure_blob_import_storage_schema_with_id,
)


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Get all import storage',
        description='Get list of all Azure import storage connections.',
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
        tags=['Storage: Azure', 'azure'],
        summary='Create new storage',
        description='Create new Azure import storage',
        request=_azure_blob_import_storage_schema,
    ),
)
class AzureBlobImportStorageListAPI(ImportStorageListAPI):
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Get import storage',
        description='Get a specific Azure import storage connection.',
        request=None,
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Update import storage',
        description='Update a specific Azure import storage connection.',
        request=_azure_blob_import_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Delete import storage',
        description='Delete a specific Azure import storage connection.',
        request=None,
    ),
)
class AzureBlobImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = AzureBlobImportStorage.objects.all()
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Sync import storage',
        description='Sync tasks from an Azure import storage connection.',
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
class AzureBlobImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Sync export storage',
        description='Sync tasks from an Azure export storage connection.',
        request=None,
    ),
)
class AzureBlobExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Validate import storage',
        description='Validate a specific Azure import storage connection.',
        request=_azure_blob_import_storage_schema_with_id,
        # expecting empty response
        responses={200: OpenApiResponse(description='OK')},
    ),
)
class AzureBlobImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = AzureBlobImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Validate export storage',
        description='Validate a specific Azure export storage connection.',
        request=_azure_blob_export_storage_schema_with_id,
        # expecting empty response
        responses={200: OpenApiResponse(description='OK')},
    ),
)
class AzureBlobExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Get all export storage',
        description='Get a list of all Azure export storage connections.',
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
        tags=['Storage: Azure', 'azure'],
        summary='Create export storage',
        description='Create a new Azure export storage connection to store annotations.',
        request=_azure_blob_export_storage_schema,
    ),
)
class AzureBlobExportStorageListAPI(ExportStorageListAPI):
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Get export storage',
        description='Get a specific Azure export storage connection.',
        request=None,
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Update export storage',
        description='Update a specific Azure export storage connection.',
        request=_azure_blob_export_storage_schema,
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: Azure', 'azure'],
        summary='Delete export storage',
        description='Delete a specific Azure export storage connection.',
        request=None,
    ),
)
class AzureBlobExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = AzureBlobExportStorage.objects.all()
    serializer_class = AzureBlobExportStorageSerializer


class AzureBlobImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


class AzureBlobExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass
