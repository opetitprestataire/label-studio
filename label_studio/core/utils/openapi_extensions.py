# from drf_spectacular.extensions import OpenApiSchemaExtension


# class XVendorExtensionsAutoSchema(OpenApiSchemaExtension):
#     """Extension to add vendor-specific extensions to OpenAPI schema"""

#     target_component = 'OpenApiAutoSchema'
#     priority = -1  # Run after other extensions

#     def map_serializer(self, auto_schema, direction):
#         # Handle vendor extensions from settings
#         allowed_extensions = tuple([e.replace('-', '_') for e in settings.X_VENDOR_OPENAPI_EXTENSIONS])

#         # Get the serializer and method
#         serializer = auto_schema.get_request_serializer() if direction == 'request' else auto_schema.get_response_serializers()

#         # For now, return the default behavior
#         return auto_schema._map_serializer(serializer, direction)


# def custom_preprocessing_hook(endpoints):
#     """Preprocessing hook to add vendor extensions to operations"""
#     allowed_extensions = tuple([e.replace('-', '_') for e in settings.X_VENDOR_OPENAPI_EXTENSIONS])

#     for (path, method), (callback, view) in endpoints:
#         # Add vendor extensions if they exist in view decorators
#         if hasattr(view, 'cls') and hasattr(view.cls, 'swagger_auto_schema'):
#             # Handle legacy swagger_auto_schema decorators
#             pass

#     return endpoints
