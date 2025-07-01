
_common_storage_schema_properties = {
    'title': 'string',
    'description': 'string',
    'project': 'integer',
    'path': 'string',
    'regex_filter': 'string',
    'use_blob_urls': 'boolean',
}

_local_files_import_storage_schema = {
    'type': 'object',
    'properties': _common_storage_schema_properties,
    'required': [],
}

_local_files_import_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id='integer',
        **_common_storage_schema_properties,
    ),
    'required': [],
}

_local_files_export_storage_schema = {
    'type': 'object',
    'properties': _common_storage_schema_properties,
    'required': [],
}

_local_files_export_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id='integer',
        **_common_storage_schema_properties,
    ),
    'required': [],
}
