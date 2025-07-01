from drf_spectacular.types import OpenApiTypes

_common_gcs_storage_schema_properties = {
    'title': OpenApiTypes.STR,
    'description': OpenApiTypes.STR,
    'project': OpenApiTypes.INT,
    'bucket': OpenApiTypes.STR,
    'prefix': OpenApiTypes.STR,
    'google_application_credentials': OpenApiTypes.STR,
    'google_project_id': OpenApiTypes.STR,
}

_gcs_import_storage_properties = dict(
    regex_filter=OpenApiTypes.STR,
    use_blob_urls=OpenApiTypes.BOOL,
    presign=OpenApiTypes.BOOL,
    presign_ttl=OpenApiTypes.INT,
    **_common_gcs_storage_schema_properties,
)

_gcs_import_storage_schema = {
    'type': 'object',
    'properties': _gcs_import_storage_properties,
    'required': [],
}

_gcs_import_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id=OpenApiTypes.INT,
        **_gcs_import_storage_properties,
    ),
    'required': [],
}

_gcs_export_storage_properties = dict(
    can_delete_objects=OpenApiTypes.BOOL,
    **_common_gcs_storage_schema_properties,
)

_gcs_export_storage_schema = {
    'type': 'object',
    'properties': _gcs_export_storage_properties,
    'required': [],
}

_gcs_export_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id=OpenApiTypes.INT,
        **_gcs_export_storage_properties,
    ),
    'required': [],
}
