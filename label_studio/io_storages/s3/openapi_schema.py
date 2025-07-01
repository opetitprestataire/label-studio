from drf_spectacular.types import OpenApiTypes

_common_s3_storage_schema_properties = {
    'title': OpenApiTypes.STR,
    'description': OpenApiTypes.STR,
    'project': OpenApiTypes.INT,
    'bucket': OpenApiTypes.STR,
    'prefix': OpenApiTypes.STR,
    'aws_access_key_id': OpenApiTypes.STR,
    'aws_secret_access_key': OpenApiTypes.STR,
    'aws_session_token': OpenApiTypes.STR,
    'aws_sse_kms_key_id': OpenApiTypes.STR,
    'region_name': OpenApiTypes.STR,
    's3_endpoint': OpenApiTypes.STR,
}

_s3_import_storage_properties = dict(
    regex_filter=OpenApiTypes.STR,
    use_blob_urls=OpenApiTypes.BOOL,
    presign=OpenApiTypes.BOOL,
    presign_ttl=OpenApiTypes.INT,
    recursive_scan=OpenApiTypes.BOOL,
    **_common_s3_storage_schema_properties,
)

_s3_import_storage_schema = {
    'type': 'object',
    'properties': _s3_import_storage_properties,
}

_s3_import_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id=OpenApiTypes.INT,
        **_s3_import_storage_properties,
    ),
}

_s3_export_storage_properties = dict(
    can_delete_objects=OpenApiTypes.BOOL,
    **_common_s3_storage_schema_properties,
)

_s3_export_storage_schema = {
    'type': 'object',
    'properties': _s3_export_storage_properties,
}

_s3_export_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id=OpenApiTypes.INT,
        **_s3_export_storage_properties,
    ),
}
