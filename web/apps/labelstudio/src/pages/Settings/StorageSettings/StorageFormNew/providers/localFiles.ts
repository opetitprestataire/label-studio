import { z } from "zod";
import { ProviderConfig } from "../types/provider";

export const localFilesProvider: ProviderConfig = {
  name: "localfiles",
  title: "Local Files",
  description: "Configure your local files connection",
  fields: [
    {
      name: "path",
      type: "text",
      label: "Path",
      required: true,
      placeholder: "/path/to/files",
      schema: z.string().min(1, "Path is required"),
    },
  ],
  layout: [
    {
      fields: ["path"],
    },
  ],
}; 