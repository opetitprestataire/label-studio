"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from django.utils.decorators import method_decorator
from drf_spectacular.utils import extend_schema

from io_storages.api import (
    ImportStorageListAPI,
    ImportStorageDetailAPI,
    ImportStorageSyncAPI,
    ImportStorageValidateAPI,
    ImportStorageFormLayoutAPI,
    ExportStorageListAPI,
    ExportStorageDetailAPI,
    ExportStorageSyncAPI,
    ExportStorageValidateAPI,
    ExportStorageFormLayoutAPI,
)

from .models import DatabricksImportStorage, DatabricksExportStorage
from .serializers import DatabricksImportStorageSerializer, DatabricksExportStorageSerializer


# Import Storage API Views

@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='List Databricks import storages',
        description='Get a list of all Databricks Unity Catalog import storage connections.',
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Create Databricks import storage',
        description='Create a new Databricks Unity Catalog import storage connection.',
    ),
)
class DatabricksImportStorageListAPI(ImportStorageListAPI):
    queryset = DatabricksImportStorage.objects.all()
    serializer_class = DatabricksImportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Get Databricks import storage',
        description='Get details of a specific Databricks Unity Catalog import storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Update Databricks import storage',
        description='Update an existing Databricks Unity Catalog import storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Delete Databricks import storage',
        description='Delete a Databricks Unity Catalog import storage connection.',
    ),
)
class DatabricksImportStorageDetailAPI(ImportStorageDetailAPI):
    queryset = DatabricksImportStorage.objects.all()
    serializer_class = DatabricksImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Sync Databricks import storage',
        description='Synchronize tasks from the Databricks Unity Catalog table to Label Studio.',
    ),
)
class DatabricksImportStorageSyncAPI(ImportStorageSyncAPI):
    serializer_class = DatabricksImportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Validate Databricks import storage',
        description='Validate Databricks Unity Catalog import storage connection settings.',
    ),
)
class DatabricksImportStorageValidateAPI(ImportStorageValidateAPI):
    serializer_class = DatabricksImportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Get Databricks import storage form layout',
        description='Get the form layout for Databricks Unity Catalog import storage configuration.',
    ),
)
class DatabricksImportStorageFormLayoutAPI(ImportStorageFormLayoutAPI):
    pass


# Export Storage API Views

@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='List Databricks export storages',
        description='Get a list of all Databricks Unity Catalog export storage connections.',
    ),
)
@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Create Databricks export storage',
        description='Create a new Databricks Unity Catalog export storage connection.',
    ),
)
class DatabricksExportStorageListAPI(ExportStorageListAPI):
    queryset = DatabricksExportStorage.objects.all()
    serializer_class = DatabricksExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Get Databricks export storage',
        description='Get details of a specific Databricks Unity Catalog export storage connection.',
    ),
)
@method_decorator(
    name='patch',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Update Databricks export storage',
        description='Update an existing Databricks Unity Catalog export storage connection.',
    ),
)
@method_decorator(
    name='delete',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Delete Databricks export storage',
        description='Delete a Databricks Unity Catalog export storage connection.',
    ),
)
class DatabricksExportStorageDetailAPI(ExportStorageDetailAPI):
    queryset = DatabricksExportStorage.objects.all()
    serializer_class = DatabricksExportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Sync Databricks export storage',
        description='Synchronize annotations from Label Studio to the Databricks Unity Catalog table.',
    ),
)
class DatabricksExportStorageSyncAPI(ExportStorageSyncAPI):
    serializer_class = DatabricksExportStorageSerializer


@method_decorator(
    name='post',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Validate Databricks export storage',
        description='Validate Databricks Unity Catalog export storage connection settings.',
    ),
)
class DatabricksExportStorageValidateAPI(ExportStorageValidateAPI):
    serializer_class = DatabricksExportStorageSerializer


@method_decorator(
    name='get',
    decorator=extend_schema(
        tags=['Storage: Databricks'],
        summary='Get Databricks export storage form layout',
        description='Get the form layout for Databricks Unity Catalog export storage configuration.',
    ),
)
class DatabricksExportStorageFormLayoutAPI(ExportStorageFormLayoutAPI):
    pass