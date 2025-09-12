"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

from django.urls import path
from . import api

urlpatterns = [
    # Import storage URLs
    path(
        'import/',
        api.DatabricksImportStorageListAPI.as_view(),
        name='databricks-import-list'
    ),
    path(
        'import/<int:pk>/',
        api.DatabricksImportStorageDetailAPI.as_view(),
        name='databricks-import-detail'
    ),
    path(
        'import/<int:pk>/sync/',
        api.DatabricksImportStorageSyncAPI.as_view(),
        name='databricks-import-sync'
    ),
    path(
        'import/validate/',
        api.DatabricksImportStorageValidateAPI.as_view(),
        name='databricks-import-validate'
    ),
    path(
        'import/form-layout/',
        api.DatabricksImportStorageFormLayoutAPI.as_view(),
        name='databricks-import-form-layout'
    ),
    
    # Export storage URLs
    path(
        'export/',
        api.DatabricksExportStorageListAPI.as_view(),
        name='databricks-export-list'
    ),
    path(
        'export/<int:pk>/',
        api.DatabricksExportStorageDetailAPI.as_view(),
        name='databricks-export-detail'
    ),
    path(
        'export/<int:pk>/sync/',
        api.DatabricksExportStorageSyncAPI.as_view(),
        name='databricks-export-sync'
    ),
    path(
        'export/validate/',
        api.DatabricksExportStorageValidateAPI.as_view(),
        name='databricks-export-validate'
    ),
    path(
        'export/form-layout/',
        api.DatabricksExportStorageFormLayoutAPI.as_view(),
        name='databricks-export-form-layout'
    ),
]