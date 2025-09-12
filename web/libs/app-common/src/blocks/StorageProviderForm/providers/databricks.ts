import { z } from "zod";
import type { ProviderConfig } from "../types/common";

export const databricksProvider: ProviderConfig = {
  name: "databricks",
  title: "Databricks Unity Catalog",
  description: "Configure your Databricks Unity Catalog connection to import tasks from and export annotations to Unity Catalog tables",
  fields: [
    {
      name: "workspace_host",
      type: "text",
      label: "Workspace URL",
      required: true,
      placeholder: "https://your-workspace.cloud.databricks.com",
      description: "Your Databricks workspace URL",
      schema: z.string().url("Must be a valid URL").min(1, "Workspace URL is required"),
    },
    {
      name: "token",
      type: "password",
      label: "Access Token",
      required: true,
      placeholder: "dapi123456789abcdef...",
      description: "Databricks personal access token or OAuth token",
      accessKey: true,
      autoComplete: "off",
      schema: z.string().min(1, "Access token is required"),
    },
    {
      name: "catalog_name",
      type: "text",
      label: "Catalog Name",
      required: true,
      placeholder: "my_catalog",
      description: "Unity Catalog catalog name",
      schema: z.string()
        .min(1, "Catalog name is required")
        .regex(/^[a-zA-Z0-9_-]+$/, "Catalog name must contain only alphanumeric characters, hyphens, and underscores"),
    },
    {
      name: "schema_name",
      type: "text",
      label: "Schema Name",
      required: true,
      placeholder: "my_schema",
      description: "Unity Catalog schema name",
      schema: z.string()
        .min(1, "Schema name is required")
        .regex(/^[a-zA-Z0-9_-]+$/, "Schema name must contain only alphanumeric characters, hyphens, and underscores"),
    },
    {
      name: "table_name",
      type: "text",
      label: "Table Name",
      required: true,
      placeholder: "my_table",
      description: "Unity Catalog table name",
      schema: z.string()
        .min(1, "Table name is required")
        .regex(/^[a-zA-Z0-9_-]+$/, "Table name must contain only alphanumeric characters, hyphens, and underscores"),
    },
    {
      name: "http_path",
      type: "text",
      label: "SQL Warehouse HTTP Path",
      required: false,
      placeholder: "/sql/1.0/warehouses/abc123def456",
      description: "SQL Warehouse HTTP path for SQL operations (recommended)",
      schema: z.string().optional().default(""),
    },
    {
      name: "cluster_id",
      type: "text",
      label: "Cluster ID",
      required: false,
      placeholder: "1234-567890-abc123",
      description: "Databricks cluster ID (alternative to SQL Warehouse)",
      schema: z.string().optional().default(""),
    },
    {
      name: "data_column",
      type: "text",
      label: "Data Column",
      required: false,
      placeholder: "task_data",
      description: "Column containing task data (JSON format). If empty, entire row will be used.",
      schema: z.string().optional().default(""),
    },
    {
      name: "id_column",
      type: "text",
      label: "ID Column",
      required: false,
      placeholder: "task_id",
      description: "Column containing unique task IDs. If empty, row index will be used.",
      schema: z.string().optional().default(""),
    },
    {
      name: "limit_rows",
      type: "counter",
      label: "Row Limit",
      min: 1,
      max: 100000,
      step: 100,
      description: "Maximum number of rows to import (optional)",
      schema: z.number().min(1).max(100000).optional(),
    },
    {
      name: "use_blob_urls",
      type: "toggle",
      label: "Use Blob URLs",
      description: "Generate URLs for data files instead of embedding data directly",
      schema: z.boolean().default(false),
    },
    {
      name: "regex_filter",
      type: "text",
      label: "Regex Filter",
      required: false,
      placeholder: ".*\\.json$",
      description: "Regex pattern for filtering table rows or columns",
      schema: z.string().optional().default(""),
    },
    {
      name: "create_table_if_not_exists",
      type: "toggle",
      label: "Create Table If Not Exists",
      description: "Automatically create the table if it doesn't exist (for exports)",
      schema: z.boolean().default(true),
    },
    {
      name: "table_format",
      type: "select",
      label: "Table Format",
      required: false,
      description: "Storage format for the table",
      schema: z.string().default("DELTA"),
      options: [
        { value: "DELTA", label: "Delta Lake" },
        { value: "PARQUET", label: "Parquet" },
        { value: "JSON", label: "JSON" },
      ],
    },
  ],
  layout: [
    {
      fields: ["workspace_host"],
    },
    {
      fields: ["token"],
    },
    {
      fields: ["catalog_name", "schema_name"],
    },
    {
      fields: ["table_name"],
    },
    {
      fields: ["http_path"],
    },
    {
      fields: ["cluster_id"],
    },
    {
      fields: ["data_column", "id_column"],
    },
    {
      fields: ["limit_rows", "use_blob_urls"],
    },
    {
      fields: ["regex_filter"],
    },
    {
      fields: ["create_table_if_not_exists", "table_format"],
    },
  ],
};

export default databricksProvider;