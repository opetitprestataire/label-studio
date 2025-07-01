_common_gcs_storage_schema_properties = {
    'title': 'string',
    'description': 'string',
    'project': 'integer',
    'bucket': 'string',
    'prefix': 'string',
    'google_application_credentials': 'string',
    'google_project_id': 'string',
}

_gcs_import_storage_properties = dict(
    regex_filter='string',
    use_blob_urls='boolean',
    presign='boolean',
    presign_ttl='integer',
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
        id='integer',
        **_gcs_import_storage_properties,
    ),
    'required': [],
}

_gcs_export_storage_properties = dict(
    can_delete_objects='boolean',
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
        id='integer',
        **_gcs_export_storage_properties,
    ),
    'required': [],
}
