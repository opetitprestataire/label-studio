# DRF Spectacular Setup for Label Studio

This document describes the setup of `drf_spectacular` in Label Studio for automatic OpenAPI 3.0 schema generation and API documentation.

## Overview

`drf_spectacular` has been configured alongside the existing `drf_yasg` setup to provide:

- **Automatic discovery** of DRF views and serializers
- **OpenAPI 3.0 schema generation** 
- **Interactive API documentation** via Swagger UI and ReDoc
- **Backward compatibility** with existing `drf_yasg` decorators

## Configuration

### 1. Dependencies

`drf_spectacular` is already included in the project dependencies:

```toml
# pyproject.toml
dependencies = [
    "drf-spectacular (==0.28.0)",
    # ... other dependencies
]
```

### 2. Django Settings

The following configuration has been added to `label_studio/core/settings/base.py`:

#### INSTALLED_APPS
```python
INSTALLED_APPS = [
    # ... existing apps
    'drf_yasg',
    'drf_spectacular',  # Added for OpenAPI 3.0 schema generation
    # ... other apps
]
```

#### REST_FRAMEWORK Configuration
```python
REST_FRAMEWORK = {
    # ... existing settings
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',  # Added for autodiscovery
    # ... other settings
}
```

#### SPECTACULAR_SETTINGS
```python
SPECTACULAR_SETTINGS = {
    'TITLE': 'Label Studio API',
    'DESCRIPTION': 'Label Studio API for data annotation and labeling',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api/',
    'SCHEMA_PATH_PREFIX_TRIM': True,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    'SECURITY': [
        {
            'Token': [],
        }
    ],
    'SECURITY_DEFINITIONS': {
        'Token': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'Token authentication. Example: "Token your-token-here"',
        }
    },
    'EXTENSIONS': {
        'x-fern': True,
    },
}
```

### 3. URL Configuration

The following URLs have been added to `label_studio/core/urls.py`:

```python
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # ... existing URLs
    
    # drf-spectacular URLs for OpenAPI 3.0 schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

## Usage

### Accessing API Documentation

Once the server is running, you can access the API documentation at:

- **OpenAPI JSON Schema**: `/api/schema/`
- **Swagger UI**: `/api/schema/swagger-ui/`
- **ReDoc**: `/api/schema/redoc/`

### Automatic View Discovery

`drf_spectacular` will automatically discover and document:

- **ViewSets** and their actions
- **APIViews** and their methods
- **Generic views** (ListCreateAPIView, RetrieveUpdateDestroyAPIView, etc.)
- **Custom actions** defined with `@action` decorator
- **Serializers** and their fields
- **URL patterns** and their parameters

### Example: Existing View Discovery

The existing `UserAPI` viewset in `users/api.py` will be automatically discovered:

```python
class UserAPI(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    # ... other configuration
```

This will generate OpenAPI documentation for:
- `GET /api/users/` - List users
- `POST /api/users/` - Create user
- `GET /api/users/{id}/` - Retrieve user
- `PUT /api/users/{id}/` - Update user
- `PATCH /api/users/{id}/` - Partial update user
- `DELETE /api/users/{id}/` - Delete user
- `POST /api/users/{id}/avatar/` - Upload avatar
- `DELETE /api/users/{id}/avatar/` - Delete avatar

### Using drf_spectacular Decorators (Optional)

While automatic discovery works for most cases, you can enhance documentation using `drf_spectacular` decorators:

```python
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample

@extend_schema(
    summary="List users",
    description="Retrieve a list of all users in the organization",
    parameters=[
        OpenApiParameter(name="page", type=int, description="Page number"),
        OpenApiParameter(name="page_size", type=int, description="Items per page"),
    ],
    examples=[
        OpenApiExample(
            "Success Response",
            value={
                "count": 10,
                "next": "http://localhost:8000/api/users/?page=2",
                "previous": None,
                "results": [...]
            }
        )
    ]
)
def list(self, request):
    # ... implementation
```

## Testing the Setup

Run the test script to verify the setup:

```bash
cd label-studio
python test_spectacular_setup.py
```

This will test:
1. ✅ drf_spectacular imports
2. ✅ INSTALLED_APPS configuration
3. ✅ SPECTACULAR_SETTINGS configuration
4. ✅ REST_FRAMEWORK schema class configuration
5. ✅ Schema generation from existing views

## Migration from drf_yasg

The current setup maintains backward compatibility with existing `drf_yasg` decorators. You can:

1. **Keep existing decorators** - They will continue to work
2. **Gradually migrate** - Replace `@swagger_auto_schema` with `@extend_schema` as needed
3. **Use both** - drf_spectacular will respect existing drf_yasg decorators

### Migration Example

**Before (drf_yasg):**
```python
from drf_yasg.utils import swagger_auto_schema

@swagger_auto_schema(
    operation_summary="List users",
    operation_description="Get a list of all users",
    responses={200: UserSerializer}
)
def list(self, request):
    # ... implementation
```

**After (drf_spectacular):**
```python
from drf_spectacular.utils import extend_schema

@extend_schema(
    summary="List users",
    description="Get a list of all users",
    responses={200: UserSerializer}
)
def list(self, request):
    # ... implementation
```

## Benefits

1. **Automatic Discovery**: No need to manually document every endpoint
2. **OpenAPI 3.0**: Modern, standardized API documentation format
3. **Better Tooling**: Enhanced support for code generation and API testing tools
4. **Interactive Documentation**: Rich UI for exploring and testing APIs
5. **Type Safety**: Better integration with modern development tools

## Troubleshooting

### Common Issues

1. **Schema not generating**: Check that `DEFAULT_SCHEMA_CLASS` is set in REST_FRAMEWORK
2. **Views not discovered**: Ensure views inherit from DRF view classes
3. **Authentication issues**: Verify SECURITY_DEFINITIONS in SPECTACULAR_SETTINGS

### Debug Commands

```bash
# Check Django configuration
python manage.py check

# Test schema generation
python test_spectacular_setup.py

# Access schema directly
curl http://localhost:8000/api/schema/
```

## Next Steps

1. **Test the setup** using the provided test script
2. **Explore the documentation** at `/api/schema/swagger-ui/`
3. **Enhance existing views** with `@extend_schema` decorators as needed
4. **Integrate with API clients** using the generated OpenAPI schema 
