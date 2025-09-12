"""This file and its contents are licensed under the Apache License 2.0. Please see the included NOTICE for copyright information and LICENSE for a copy of the license.
"""

import os
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from io_storages.serializers import ImportStorageSerializer, ExportStorageSerializer
from .models import DatabricksImportStorage, DatabricksExportStorage


class DatabricksStorageSerializerMixin:
    """Common serializer functionality for Databricks storage"""
    
    # Fields to hide in API responses for security
    secure_fields = ['token']
    
    def to_representation(self, instance):
        """Hide secure fields in API responses"""
        result = super().to_representation(instance)  # type: ignore
        # Hide secure fields in responses
        for field in self.secure_fields:
            result.pop(field, None)
        return result
    
    def validate_workspace_host(self, value):
        """Validate Databricks workspace URL"""
        if value and not value.startswith(('https://', 'http://')):
            raise ValidationError('Workspace host must be a valid URL starting with https:// or http://')
        return value
    
    def validate_catalog_name(self, value):
        """Validate Unity Catalog name"""
        if value and not value.replace('_', '').replace('-', '').isalnum():
            raise ValidationError('Catalog name must contain only alphanumeric characters, hyphens, and underscores')
        return value
    
    def validate_schema_name(self, value):
        """Validate schema name"""
        if value and not value.replace('_', '').replace('-', '').isalnum():
            raise ValidationError('Schema name must contain only alphanumeric characters, hyphens, and underscores')
        return value
    
    def validate_table_name(self, value):
        """Validate table name"""
        if value and not value.replace('_', '').replace('-', '').isalnum():
            raise ValidationError('Table name must contain only alphanumeric characters, hyphens, and underscores')
        return value
    
    def validate(self, data):
        """Comprehensive validation of Databricks storage configuration"""
        data = super().validate(data)  # type: ignore
        
        # Check required fields
        required_fields = ['workspace_host', 'token', 'catalog_name', 'schema_name', 'table_name']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            raise ValidationError(f"Required fields missing: {', '.join(missing_fields)}")
        
        # Validate either http_path (SQL Warehouse) or cluster_id is provided for operations
        if not data.get('http_path') and not data.get('cluster_id'):
            raise ValidationError(
                'Either http_path (SQL Warehouse) or cluster_id must be provided for SQL operations'
            )
        
        # Create temporary storage instance for connection validation
        storage = getattr(self, 'instance', None) or getattr(self, 'Meta').model(**data)  # type: ignore
        if getattr(self, 'instance', None):
            for key, value in data.items():
                setattr(storage, key, value)
        
        try:
            storage.validate_connection()
        except ImportError as e:
            raise ValidationError(f"Missing dependency: {str(e)}")
        except Exception as e:
            raise ValidationError(f"Connection validation failed: {str(e)}")
        
        return data


class DatabricksImportStorageSerializer(DatabricksStorageSerializerMixin, ImportStorageSerializer):
    """Serializer for Databricks Unity Catalog import storage"""
    
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    
    class Meta:
        model = DatabricksImportStorage
        fields = '__all__'
    
    def validate_data_column(self, value):
        """Validate data column name"""
        if value and not value.replace('_', '').isalnum():
            raise ValidationError('Data column name must contain only alphanumeric characters and underscores')
        return value
    
    def validate_id_column(self, value):
        """Validate ID column name"""
        if value and not value.replace('_', '').isalnum():
            raise ValidationError('ID column name must contain only alphanumeric characters and underscores')
        return value
    
    def validate_limit_rows(self, value):
        """Validate row limit"""
        if value is not None and value <= 0:
            raise ValidationError('Row limit must be a positive integer')
        return value


class DatabricksExportStorageSerializer(DatabricksStorageSerializerMixin, ExportStorageSerializer):
    """Serializer for Databricks Unity Catalog export storage"""
    
    type = serializers.ReadOnlyField(default=os.path.basename(os.path.dirname(__file__)))
    
    class Meta:
        model = DatabricksExportStorage
        fields = '__all__'
    
    def validate_table_format(self, value):
        """Validate table format"""
        valid_formats = ['DELTA', 'PARQUET', 'JSON']
        if value and value.upper() not in valid_formats:
            raise ValidationError(f'Table format must be one of: {", ".join(valid_formats)}')
        return value.upper() if value else value