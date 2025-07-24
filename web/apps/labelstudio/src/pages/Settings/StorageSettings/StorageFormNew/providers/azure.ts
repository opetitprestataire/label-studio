import { z } from "zod";
import { ProviderConfig } from "../types/provider";

export const azureProvider: ProviderConfig = {
  name: "azure",
  title: "Azure Blob Storage",
  description: "Configure your Azure Blob Storage connection",
  fields: [
    {
      name: "container",
      type: "text",
      label: "Container Name",
      required: true,
      placeholder: "my-azure-container",
      schema: z.string().min(1, "Container name is required"),
    },
    {
      name: "account_name",
      type: "text",
      label: "Storage Account Name",
      required: true,
      placeholder: "mystorageaccount",
      schema: z.string().min(1, "Storage Account Name is required"),
    },
  ],
  layout: [
    {
      fields: ["container"],
    },
    {
      fields: ["account_name"],
    },
  ],
}; 