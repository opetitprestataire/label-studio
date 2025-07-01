from drf_spectacular.types import OpenApiTypes

_common_storage_schema_properties = {
    'title': OpenApiTypes.STR,
    'description': OpenApiTypes.STR,
    'project': OpenApiTypes.INT,
    'container': OpenApiTypes.STR,
    'prefix': OpenApiTypes.STR,
    'account_name': OpenApiTypes.STR,
    'account_key': OpenApiTypes.STR,
}


_azure_blob_import_storage_properties = dict(
    regex_filter=OpenApiTypes.STR,
    use_blob_urls=OpenApiTypes.BOOL,
    presign=OpenApiTypes.BOOL,
    presign_ttl=OpenApiTypes.INT,
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
        id=OpenApiTypes.INT,
        **_azure_blob_import_storage_properties,
    ),
    'required': [],
}

_azure_blob_export_storage_properties = dict(
    can_delete_objects=OpenApiTypes.BOOL,
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
        id=OpenApiTypes.INT,
        **_azure_blob_export_storage_properties,
    ),
    'required': [],
}
