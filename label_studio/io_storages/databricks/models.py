"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import json
import logging
import re
from typing import Iterator, Any, Union, List
from urllib.parse import urlparse

from django.conf import settings
from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.utils.translation import gettext_lazy as _

from io_storages.base_models import (
    ExportStorage,
    ExportStorageLink,
    ImportStorage,
    ImportStorageLink,
    ProjectStorageMixin,
)
from io_storages.utils import StorageObject, load_tasks_json
from tasks.models import Annotation

logger = logging.getLogger(__name__)

# Cache for Databricks clients to avoid repeated initialization
clients_cache = {}


class DatabricksStorageMixin(models.Model):
    """Base mixin containing common fields for Databricks Unity Catalog storage"""
    
    # Connection settings
    workspace_host = models.TextField(
        _('workspace_host'), 
        null=True, 
        blank=True, 
        help_text='Databricks workspace URL (e.g., https://your-workspace.cloud.databricks.com)'
    )
    token = models.TextField(
        _('token'), 
        null=True, 
        blank=True, 
        help_text='Databricks personal access token or OAuth token'
    )
    
    # Unity Catalog settings
    catalog_name = models.TextField(
        _('catalog_name'), 
        null=True, 
        blank=True, 
        help_text='Unity Catalog catalog name'
    )
    schema_name = models.TextField(
        _('schema_name'), 
        null=True, 
        blank=True, 
        help_text='Unity Catalog schema name'
    )
    table_name = models.TextField(
        _('table_name'), 
        null=True, 
        blank=True, 
        help_text='Unity Catalog table name'
    )
    
    # Filtering and options
    regex_filter = models.TextField(
        _('regex_filter'),
        null=True,
        blank=True,
        help_text='Regex pattern for filtering table rows or columns'
    )
    use_blob_urls = models.BooleanField(
        _('use_blob_urls'),
        default=False,
        help_text='Generate URLs for data files instead of embedding data directly'
    )
    
    # Additional connection options
    http_path = models.TextField(
        _('http_path'),
        null=True,
        blank=True,
        help_text='SQL Warehouse HTTP path (optional, for SQL operations)'
    )
    cluster_id = models.TextField(
        _('cluster_id'),
        null=True,
        blank=True,
        help_text='Databricks cluster ID (optional, alternative to SQL Warehouse)'
    )
    
    @property
    def url_scheme(self):
        """URL scheme for Databricks Unity Catalog"""
        return 'databricks'
    
    def get_client(self):
        """Initialize and return Databricks WorkspaceClient"""
        # Cache clients to avoid repeated initialization (~100ms per init)
        cache_key = f'{self.workspace_host}:{self.token}'
        if cache_key in clients_cache:
            return clients_cache[cache_key]
            
        try:
            from databricks.sdk import WorkspaceClient  # type: ignore
            
            client = WorkspaceClient(
                host=self.workspace_host,
                token=self.token
            )
            clients_cache[cache_key] = client
            return client
            
        except ImportError:
            raise ImportError(
                "databricks-sdk is required for Databricks Unity Catalog integration. "
                "Install it with: pip install databricks-sdk"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Databricks client: {e}")
            raise
    
    def validate_connection(self, client=None):
        """Validate Databricks connection and Unity Catalog access"""
        logger.debug('Validating Databricks Unity Catalog connection')
        
        if client is None:
            client = self.get_client()
        
        try:
            # Test basic connectivity
            current_user = client.current_user.me()
            logger.debug(f'Connected as user: {current_user.user_name}')
            
            # Validate catalog access
            if self.catalog_name:
                try:
                    catalog = client.catalogs.get(self.catalog_name)
                    logger.debug(f'Catalog access confirmed: {catalog.name}')
                except Exception as e:
                    raise ValueError(f'Cannot access catalog "{self.catalog_name}": {e}')
            
            # Validate schema access
            if self.catalog_name and self.schema_name:
                try:
                    schema_full_name = f'{self.catalog_name}.{self.schema_name}'
                    schema = client.schemas.get(schema_full_name)
                    logger.debug(f'Schema access confirmed: {schema.full_name}')
                except Exception as e:
                    raise ValueError(f'Cannot access schema "{schema_full_name}": {e}')
            
            # Validate table access for imports
            if self.catalog_name and self.schema_name and self.table_name:
                try:
                    table_full_name = f'{self.catalog_name}.{self.schema_name}.{self.table_name}'
                    table = client.tables.get(table_full_name)
                    logger.debug(f'Table access confirmed: {table.full_name}')
                except Exception as e:
                    # For export storage, table might not exist yet, which is okay
                    if 'Export' not in self.__class__.__name__:
                        raise ValueError(f'Cannot access table "{table_full_name}": {e}')
                    else:
                        logger.debug(f'Table "{table_full_name}" not found (okay for export storage)')
                        
        except Exception as e:
            logger.error(f'Databricks connection validation failed: {e}')
            raise
    
    def get_full_table_name(self):
        """Get the fully qualified table name"""
        if not all([self.catalog_name, self.schema_name, self.table_name]):
            raise ValueError("catalog_name, schema_name, and table_name are all required")
        return f'{self.catalog_name}.{self.schema_name}.{self.table_name}'
    
    @property
    def path_full(self):
        """Full path for display purposes"""
        try:
            return f'{self.url_scheme}://{self.get_full_table_name()}'
        except ValueError:
            return f'{self.url_scheme}://{self.workspace_host}'
    
    @property
    def type_full(self):
        """Human-readable type name"""
        return 'Databricks Unity Catalog'
    
    class Meta:
        abstract = True


class DatabricksImportStorageBase(DatabricksStorageMixin, ImportStorage):
    """Base class for Databricks Unity Catalog import functionality"""
    
    # Import-specific settings
    data_column = models.TextField(
        _('data_column'),
        null=True,
        blank=True,
        help_text='Column containing task data (JSON format). If empty, entire row will be used.'
    )
    id_column = models.TextField(
        _('id_column'),
        null=True,
        blank=True,
        help_text='Column containing unique task IDs. If empty, row index will be used.'
    )
    limit_rows = models.PositiveIntegerField(
        _('limit_rows'),
        null=True,
        blank=True,
        help_text='Maximum number of rows to import (optional)'
    )
    
    def iter_objects(self) -> Iterator[Any]:
        """Iterate over rows in the Unity Catalog table"""
        logger.debug(f'Iterating over Databricks table: {self.get_full_table_name()}')
        
        client = self.get_client()
        table_full_name = self.get_full_table_name()
        
        try:
            # Build SQL query
            sql_query = f"SELECT * FROM {table_full_name}"
            
            # Add regex filter if specified
            if self.regex_filter and self.data_column:
                sql_query += f" WHERE {self.data_column} RLIKE '{self.regex_filter}'"
            
            # Add limit if specified
            if self.limit_rows:
                sql_query += f" LIMIT {self.limit_rows}"
            
            logger.debug(f'Executing SQL: {sql_query}')
            
            # Execute query using SQL execution API
            if self.http_path:
                # Use SQL Warehouse
                statement_execution = client.statement_execution.execute(
                    warehouse_id=self.http_path.split('/')[-1],  # Extract warehouse ID from path
                    statement=sql_query
                )
                result = statement_execution.result()
                
                # Yield each row as a storage object
                if result and hasattr(result, 'data_array'):
                    for i, row in enumerate(result.data_array):
                        yield {'row_index': i, 'row_data': row}
            else:
                # Use cluster for SQL execution (requires additional setup)
                logger.warning('Cluster-based SQL execution not yet implemented. Please use SQL Warehouse.')
                
        except Exception as e:
            logger.error(f'Error iterating over Databricks table: {e}')
            raise
    
    def get_data(self, obj: dict) -> List[StorageObject]:
        """Convert table row to Label Studio task data"""
        try:
            row_data = obj.get('row_data', {})
            row_index = obj.get('row_index', 0)
            
            # Generate unique key for this row
            if self.id_column and self.id_column in row_data:
                key = str(row_data[self.id_column])
            else:
                key = f'row_{row_index}'
            
            if self.use_blob_urls:
                # Return URL reference instead of embedded data
                uri = f'{self.url_scheme}://{self.get_full_table_name()}#{key}'
                data_key = settings.DATA_UNDEFINED_NAME
                task = {data_key: uri}
                return [StorageObject(key=key, task_data=task)]
            
            # Extract task data from specified column or use entire row
            if self.data_column and self.data_column in row_data:
                task_data_str = row_data[self.data_column]
                if isinstance(task_data_str, str):
                    try:
                        task_data = json.loads(task_data_str)
                    except json.JSONDecodeError:
                        # If not JSON, treat as plain text
                        task_data = {settings.DATA_UNDEFINED_NAME: task_data_str}
                else:
                    task_data = {settings.DATA_UNDEFINED_NAME: str(task_data_str)}
            else:
                # Use entire row as task data
                task_data = dict(row_data)
            
            return [StorageObject(key=key, task_data=task_data)]
            
        except Exception as e:
            logger.error(f'Error processing Databricks row data: {e}')
            return []
    
    def generate_http_url(self, url):
        """Generate HTTP URL for accessing Databricks data"""
        # For Databricks, we can generate workspace URLs or use the Unity REST API
        try:
            parsed = urlparse(url)
            if parsed.scheme == self.url_scheme:
                # Generate a workspace URL for the table
                table_path = parsed.netloc
                row_id = parsed.fragment if parsed.fragment else ''
                
                workspace_url = f"{self.workspace_host}/sql/editor/"
                if row_id:
                    workspace_url += f"?query=SELECT * FROM {table_path} WHERE id = '{row_id}'"
                else:
                    workspace_url += f"?query=SELECT * FROM {table_path}"
                
                return workspace_url
        except Exception as e:
            logger.error(f'Error generating HTTP URL for {url}: {e}')
        
        return url
    
    def can_resolve_url(self, url: str) -> bool:
        """Check if this storage can resolve the given URL"""
        try:
            parsed = urlparse(url)
            return bool(
                parsed.scheme == self.url_scheme and
                self.workspace_host and
                self.catalog_name and
                self.schema_name and
                parsed.netloc.startswith(f'{self.catalog_name}.{self.schema_name}')
            )
        except Exception:
            return False
    
    class Meta:
        abstract = True


class DatabricksImportStorage(ProjectStorageMixin, DatabricksImportStorageBase):
    """Concrete implementation of Databricks Unity Catalog import storage"""
    
    class Meta:
        abstract = False


class DatabricksExportStorage(DatabricksStorageMixin, ExportStorage):
    """Databricks Unity Catalog export storage implementation"""
    
    # Export-specific settings
    create_table_if_not_exists = models.BooleanField(
        _('create_table_if_not_exists'),
        default=True,
        help_text='Create table automatically if it does not exist'
    )
    table_format = models.CharField(
        _('table_format'),
        max_length=50,
        default='DELTA',
        choices=[
            ('DELTA', 'Delta Lake'),
            ('PARQUET', 'Parquet'),
            ('JSON', 'JSON'),
        ],
        help_text='Table storage format'
    )
    
    def save_annotation(self, annotation):
        """Save annotation to Databricks Unity Catalog table"""
        logger.debug(f'Saving annotation {annotation.id} to Databricks table')
        
        try:
            # Serialize annotation data
            ser_annotation = self._get_serialized_data(annotation)
            
            # Get client and table name
            client = self.get_client()
            table_full_name = self.get_full_table_name()
            
            # Create table if it doesn't exist and option is enabled
            if self.create_table_if_not_exists:
                self._ensure_table_exists(client, table_full_name, ser_annotation)
            
            # Prepare data for insertion
            annotation_data = {
                'annotation_id': annotation.id,
                'task_id': annotation.task.id if annotation.task else None,
                'annotation_data': json.dumps(ser_annotation),
                'created_at': annotation.created_at.isoformat(),
                'updated_at': annotation.updated_at.isoformat(),
            }
            
            # Insert data using SQL (simplified approach)
            # In a production implementation, you might want to use Delta Live Tables
            # or batch inserts for better performance
            insert_sql = self._build_insert_sql(table_full_name, annotation_data)
            
            if self.http_path:
                client.statement_execution.execute(
                    warehouse_id=self.http_path.split('/')[-1],
                    statement=insert_sql
                )
            
            # Create storage link
            DatabricksExportStorageLink.create(annotation, self)
            
        except Exception as e:
            logger.error(f'Error saving annotation to Databricks: {e}')
            raise
    
    def delete_annotation(self, annotation):
        """Delete annotation from Databricks table"""
        try:
            client = self.get_client()
            table_full_name = self.get_full_table_name()
            
            # Delete from table
            delete_sql = f"DELETE FROM {table_full_name} WHERE annotation_id = {annotation.id}"
            
            if self.http_path:
                client.statement_execution.execute(
                    warehouse_id=self.http_path.split('/')[-1],
                    statement=delete_sql
                )
            
            # Remove storage link
            DatabricksExportStorageLink.objects.filter(
                annotation=annotation,
                storage=self
            ).delete()
            
        except Exception as e:
            logger.error(f'Error deleting annotation from Databricks: {e}')
            raise
    
    def _ensure_table_exists(self, client, table_full_name, sample_data):
        """Create table if it doesn't exist"""
        try:
            # Check if table exists
            client.tables.get(table_full_name)
            logger.debug(f'Table {table_full_name} already exists')
        except Exception:
            # Table doesn't exist, create it
            logger.info(f'Creating table {table_full_name}')
            
            create_sql = f"""
            CREATE TABLE {table_full_name} (
                annotation_id BIGINT,
                task_id BIGINT,
                annotation_data STRING,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            ) USING {self.table_format}
            """
            
            if self.http_path:
                client.statement_execution.execute(
                    warehouse_id=self.http_path.split('/')[-1],
                    statement=create_sql
                )
    
    def _build_insert_sql(self, table_full_name, data):
        """Build INSERT SQL statement"""
        columns = ', '.join(data.keys())
        values = ', '.join([f"'{v}'" if isinstance(v, str) else str(v) for v in data.values()])
        return f"INSERT INTO {table_full_name} ({columns}) VALUES ({values})"


# Storage link models
class DatabricksImportStorageLink(ImportStorageLink):
    storage = models.ForeignKey(
        DatabricksImportStorage,
        on_delete=models.CASCADE,
        related_name='links'
    )


class DatabricksExportStorageLink(ExportStorageLink):
    storage = models.ForeignKey(
        DatabricksExportStorage,
        on_delete=models.CASCADE,
        related_name='links'
    )


# Signal handlers for automatic export
@receiver(post_save, sender=Annotation)
def export_annotation_to_databricks_storages(sender, instance, **kwargs):
    """Auto-export annotations to connected Databricks export storages"""
    project = instance.project
    if hasattr(project, 'io_storages_databricksexportstorages'):
        for storage in project.io_storages_databricksexportstorages.all():
            logger.debug(f'Auto-exporting annotation {instance.id} to Databricks storage {storage.id}')
            try:
                storage.save_annotation(instance)
            except Exception as e:
                logger.error(f'Failed to auto-export annotation {instance.id}: {e}')


@receiver(pre_delete, sender=Annotation)
def delete_annotation_from_databricks_storages(sender, instance, **kwargs):
    """Auto-delete annotations from connected Databricks export storages"""
    project = instance.project
    if hasattr(project, 'io_storages_databricksexportstorages'):
        for storage in project.io_storages_databricksexportstorages.all():
            logger.debug(f'Auto-deleting annotation {instance.id} from Databricks storage {storage.id}')
            try:
                storage.delete_annotation(instance)
            except Exception as e:
                logger.error(f'Failed to auto-delete annotation {instance.id}: {e}')