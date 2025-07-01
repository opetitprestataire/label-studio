
_common_storage_schema_properties = {
    'title': 'string',
    'description': 'string',
    'project': 'integer',
    'container': 'string',
    'prefix': 'string',
    'account_name': 'string',
    'account_key': 'string',
}


_azure_blob_import_storage_properties = dict(
    regex_filter='string',
    use_blob_urls='boolean',
    presign='boolean',
    presign_ttl='integer',
    **_common_storage_schema_properties,
)

_azure_blob_import_storage_schema = {
    'type': 'object',
    'properties': _azure_blob_import_storage_properties,
    'required': [],
}

_azure_blob_import_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id='integer',
        **_azure_blob_import_storage_properties,
    ),
    'required': [],
}

_azure_blob_export_storage_properties = dict(
    can_delete_objects='boolean',
    **_common_storage_schema_properties,
)

_azure_blob_export_storage_schema = {
    'type': 'object',
    'properties': _azure_blob_export_storage_properties,
    'required': [],
}

_azure_blob_export_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id='integer',
        **_azure_blob_export_storage_properties,
    ),
    'required': [],
}
