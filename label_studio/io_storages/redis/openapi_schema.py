
_common_redis_storage_schema_properties = {
    'title': 'string',
    'description': 'string',
    'project': 'integer',
    'path': 'string',
    'host': 'string',
    'port': 'string',
    'password': 'string',
}


_redis_import_storage_properties = dict(
    regex_filter='string',
    use_blob_urls='boolean',
    **_common_redis_storage_schema_properties,
)

_redis_import_storage_schema = {
    'type': 'object',
    'properties': _redis_import_storage_properties,
    'required': [],
}

_redis_import_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id='integer',
        **_redis_import_storage_properties,
    ),
    'required': [],
}


_redis_export_storage_properties = dict(
    db='integer',
    can_delete_objects='boolean',
    **_common_redis_storage_schema_properties,
)

_redis_export_storage_schema = {
    'type': 'object',
    'properties': _redis_export_storage_properties,
    'required': [],
}

_redis_export_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id='integer',
        **_redis_export_storage_properties,
    ),
    'required': [],
}
