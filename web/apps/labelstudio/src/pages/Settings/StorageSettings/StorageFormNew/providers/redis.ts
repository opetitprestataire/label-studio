import { z } from "zod";
import { ProviderConfig } from "../types/provider";

export const redisProvider: ProviderConfig = {
  name: "redis",
  title: "Redis",
  description: "Configure your Redis connection",
  fields: [
    {
      name: "host",
      type: "text",
      label: "Host",
      required: true,
      placeholder: "localhost",
      schema: z.string().min(1, "Host is required"),
    },
    {
      name: "port",
      type: "number",
      label: "Port",
      required: true,
      placeholder: "6379",
      min: 1,
      max: 65535,
      schema: z.number().min(1).max(65535).default(6379),
    },
  ],
  layout: [
    {
      fields: ["host", "port"],
    },
  ],
}; 