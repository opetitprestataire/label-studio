"""Databricks Unity Catalog storage provider for Label Studio.

This module provides integration with Databricks Unity Catalog for importing and exporting
Label Studio tasks and annotations. It supports:

- Reading task data from Unity Catalog tables
- Exporting annotations to Unity Catalog tables  
- Authentication using Databricks tokens or OAuth
- Support for both managed and external tables
"""