"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import logging
from functools import wraps
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


def catch_databricks_errors(func):
    """Decorator to catch and re-raise Databricks-specific errors with better messages"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ImportError as e:
            if 'databricks' in str(e).lower():
                raise ImportError(
                    "Databricks SDK is required for Unity Catalog integration. "
                    "Install it with: pip install databricks-sdk"
                ) from e
            raise
        except Exception as e:
            # Add context to Databricks-specific errors
            error_message = str(e)
            if 'PERMISSION_DENIED' in error_message:
                raise PermissionError(
                    f"Databricks permission denied: {error_message}. "
                    "Check your token permissions and Unity Catalog access rights."
                ) from e
            elif 'INVALID_PARAMETER_VALUE' in error_message:
                raise ValueError(
                    f"Invalid Databricks parameter: {error_message}. "
                    "Verify your catalog, schema, and table names."
                ) from e
            elif 'NOT_FOUND' in error_message:
                raise FileNotFoundError(
                    f"Databricks resource not found: {error_message}. "
                    "Check if the catalog, schema, or table exists."
                ) from e
            else:
                # Re-raise other exceptions as-is
                raise
    return wrapper


class DatabricksTableHelper:
    """Helper class for Databricks Unity Catalog table operations"""
    
    def __init__(self, client, catalog_name: str, schema_name: str, table_name: str):
        self.client = client
        self.catalog_name = catalog_name
        self.schema_name = schema_name
        self.table_name = table_name
    
    @property
    def full_table_name(self) -> str:
        """Get fully qualified table name"""
        return f"{self.catalog_name}.{self.schema_name}.{self.table_name}"
    
    @catch_databricks_errors
    def table_exists(self) -> bool:
        """Check if table exists in Unity Catalog"""
        try:
            self.client.tables.get(self.full_table_name)
            return True
        except Exception:
            return False
    
    @catch_databricks_errors
    def get_table_info(self) -> Optional[Dict[str, Any]]:
        """Get table information from Unity Catalog"""
        try:
            table_info = self.client.tables.get(self.full_table_name)
            return {
                'name': table_info.name,
                'full_name': table_info.full_name,
                'catalog_name': table_info.catalog_name,
                'schema_name': table_info.schema_name,
                'table_type': table_info.table_type,
                'data_source_format': table_info.data_source_format,
                'storage_location': table_info.storage_location,
                'columns': [
                    {
                        'name': col.name,
                        'type': col.type_name,
                        'nullable': col.nullable,
                        'comment': col.comment
                    }
                    for col in (table_info.columns or [])
                ],
                'properties': table_info.properties,
                'owner': table_info.owner,
                'created_at': table_info.created_at,
                'updated_at': table_info.updated_at,
            }
        except Exception as e:
            logger.error(f"Error getting table info for {self.full_table_name}: {e}")
            return None
    
    @catch_databricks_errors
    def get_table_columns(self) -> Dict[str, str]:
        """Get table column names and types"""
        table_info = self.get_table_info()
        if table_info and table_info.get('columns'):
            return {
                col['name']: col['type'] 
                for col in table_info['columns']
                if col.get('name') and col.get('type')
            }
        return {}
    
    @catch_databricks_errors
    def validate_column_exists(self, column_name: str) -> bool:
        """Check if a specific column exists in the table"""
        columns = self.get_table_columns()
        return column_name in columns
    
    @catch_databricks_errors
    def create_table_ddl(self, table_format: str = 'DELTA') -> str:
        """Generate CREATE TABLE DDL for annotations export"""
        return f"""
        CREATE TABLE IF NOT EXISTS {self.full_table_name} (
            annotation_id BIGINT COMMENT 'Label Studio annotation ID',
            task_id BIGINT COMMENT 'Label Studio task ID',
            project_id BIGINT COMMENT 'Label Studio project ID',
            annotation_data STRING COMMENT 'Serialized annotation data (JSON)',
            annotation_result STRING COMMENT 'Annotation result data (JSON)',
            annotation_meta STRING COMMENT 'Annotation metadata (JSON)',
            created_at TIMESTAMP COMMENT 'Annotation creation timestamp',
            updated_at TIMESTAMP COMMENT 'Annotation last update timestamp',
            created_by STRING COMMENT 'User who created the annotation',
            updated_by STRING COMMENT 'User who last updated the annotation'
        ) USING {table_format.upper()}
        COMMENT 'Label Studio annotations exported from Unity Catalog storage'
        TBLPROPERTIES (
            'source' = 'label-studio',
            'version' = '1.0'
        )
        """.strip()


def validate_databricks_connection(workspace_host: str, token: str) -> Dict[str, Any]:
    """Validate Databricks connection and return connection info"""
    try:
        from databricks.sdk import WorkspaceClient  # type: ignore
        
        client = WorkspaceClient(
            host=workspace_host,
            token=token
        )
        
        # Test basic connectivity
        current_user = client.current_user.me()
        
        return {
            'valid': True,
            'user': current_user.user_name,
            'workspace_host': workspace_host,
            'message': f'Successfully connected as {current_user.user_name}'
        }
        
    except ImportError:
        return {
            'valid': False,
            'error': 'Databricks SDK not installed',
            'message': 'Install databricks-sdk: pip install databricks-sdk'
        }
    except Exception as e:
        return {
            'valid': False,
            'error': str(e),
            'message': f'Connection failed: {str(e)}'
        }


def parse_databricks_url(url: str) -> Optional[Dict[str, Optional[str]]]:
    """Parse Databricks Unity Catalog URL to extract components"""
    # Example URL: databricks://catalog.schema.table#row_id
    # or: databricks://workspace.cloud.databricks.com/catalog.schema.table
    
    try:
        from urllib.parse import urlparse
        
        parsed = urlparse(url)
        if parsed.scheme != 'databricks':
            return None
        
        # Extract table path and row ID
        table_path = parsed.netloc or parsed.path.lstrip('/')
        row_id = parsed.fragment
        
        # Split table path into components
        parts = table_path.split('.')
        if len(parts) >= 3:
            return {
                'catalog': parts[0],
                'schema': parts[1],
                'table': parts[2],
                'row_id': row_id if row_id else None,
            }
        
        return None
        
    except Exception as e:
        logger.error(f"Error parsing Databricks URL {url}: {e}")
        return None


def build_databricks_workspace_url(workspace_host: str, catalog: str, schema: str, table: str, query_params: Optional[Dict[str, str]] = None) -> str:
    """Build a Databricks workspace URL for accessing a table"""
    base_url = workspace_host.rstrip('/')
    table_path = f"{catalog}.{schema}.{table}"
    
    # Build SQL Editor URL
    url = f"{base_url}/sql/editor/"
    
    # Add query parameters if provided
    if query_params:
        query_string = '&'.join([f"{k}={v}" for k, v in query_params.items()])
        url += f"?{query_string}"
    
    return url


def format_databricks_error(error: Exception) -> str:
    """Format Databricks errors into user-friendly messages"""
    error_str = str(error)
    
    # Common Databricks error patterns and their user-friendly messages
    error_mappings = {
        'PERMISSION_DENIED': 'Permission denied. Check your token and Unity Catalog access rights.',
        'INVALID_PARAMETER_VALUE': 'Invalid parameter. Verify catalog, schema, and table names.',
        'NOT_FOUND': 'Resource not found. Check if catalog, schema, or table exists.',
        'ALREADY_EXISTS': 'Resource already exists.',
        'RESOURCE_EXHAUSTED': 'Resource limit exceeded. Try reducing query size or contact admin.',
        'UNAUTHENTICATED': 'Authentication failed. Check your token.',
        'UNAVAILABLE': 'Service temporarily unavailable. Try again later.',
        'DEADLINE_EXCEEDED': 'Request timed out. Try reducing query complexity.',
    }
    
    for error_code, friendly_message in error_mappings.items():
        if error_code in error_str:
            return f"{friendly_message} (Original error: {error_str})"
    
    return error_str