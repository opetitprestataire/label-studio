from drf_spectacular.types import OpenApiTypes

_common_storage_schema_properties = {
    'title': OpenApiTypes.STR,
    'description': OpenApiTypes.STR,
    'project': OpenApiTypes.INT,
    'path': OpenApiTypes.STR,
    'regex_filter': OpenApiTypes.STR,
    'use_blob_urls': OpenApiTypes.BOOL,
}

_local_files_import_storage_schema = {
    'type': 'object',
    'properties': _common_storage_schema_properties,
    'required': [],
}

_local_files_import_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id=OpenApiTypes.INT,
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
        id=OpenApiTypes.INT,
        **_common_storage_schema_properties,
    ),
    'required': [],
}
