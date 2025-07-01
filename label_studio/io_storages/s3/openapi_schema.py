_common_s3_storage_schema_properties = {
    'title': 'string',
    'description': 'string',
    'project': 'integer',
    'bucket': 'string',
    'prefix': 'string',
    'aws_access_key_id': 'string',
    'aws_session_token': 'string',
    'aws_sse_kms_key_id': 'string',
    'region_name': 'string',
    's3_endpoint': 'string',
}

_s3_import_storage_properties = dict(
    regex_filter='string',
    use_blob_urls='boolean',
    presign='boolean',
    presign_ttl='integer',
    recursive_scan='boolean',
    **_common_s3_storage_schema_properties,
)

_s3_import_storage_schema = {
    'type': 'object',
    'properties': _s3_import_storage_properties,
}

_s3_import_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id='integer',
        **_s3_import_storage_properties,
    ),
}

_s3_export_storage_properties = dict(
    can_delete_objects='boolean',
    **_common_s3_storage_schema_properties,
)

_s3_export_storage_schema = {
    'type': 'object',
    'properties': _s3_export_storage_properties,
}

_s3_export_storage_schema_with_id = {
    'type': 'object',
    'properties': dict(
        id='integer',
        **_s3_export_storage_properties,
    ),
}
