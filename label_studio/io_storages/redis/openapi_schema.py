from drf_spectacular.types import OpenApiTypes

_common_redis_storage_schema_properties = {
    'title': OpenApiTypes.STR,
    'description': OpenApiTypes.STR,
    'project': OpenApiTypes.INT,
    'path': OpenApiTypes.STR,
    'host': OpenApiTypes.STR,
    'port': OpenApiTypes.STR,
    'password': OpenApiTypes.STR,
}


_redis_import_storage_properties = dict(
    regex_filter=OpenApiTypes.STR,
    use_blob_urls=OpenApiTypes.BOOL,
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
        id=OpenApiTypes.INT,
        **_redis_import_storage_properties,
    ),
    'required': [],
}


_redis_export_storage_properties = dict(
    db=OpenApiTypes.INT,
    can_delete_objects=OpenApiTypes.BOOL,
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
        id=OpenApiTypes.INT,
        **_redis_export_storage_properties,
    ),
    'required': [],
}
