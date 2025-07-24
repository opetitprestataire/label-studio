import { z } from "zod";
import type { ProviderConfig } from "../types/provider";

export const gcpProvider: ProviderConfig = {
  name: "gcs",
  title: "Google Cloud Storage",
  description: "Configure your Google Cloud Storage connection",
  fields: [
    {
      name: "bucket",
      type: "text",
      label: "Bucket Name",
      required: true,
      placeholder: "my-gcp-bucket",
      schema: z.string().min(1, "Bucket name is required"),
    },
    {
      name: "google_application_credentials",
      type: "textarea",
      label: "Service Account Key",
      required: true,
      placeholder: "Paste your service account JSON key here",
      schema: z.string().min(1, "Service Account Key is required"),
    },
  ],
  layout: [
    {
      fields: ["bucket"],
    },
    {
      fields: ["google_application_credentials"],
    },
  ],
};

