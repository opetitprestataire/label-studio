import { z } from "zod";
import { getProviderConfig } from "./providers";
import { assembleSchema } from "./types/provider";

// Step validation schemas
export const step1Schema = z.object({
  provider: z.string().min(1, "Please select a storage provider"),
});

// Helper function to get provider-specific schema
export const getProviderSchema = (provider: string, isEditMode = false) => {
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    return z.object({}); // Empty schema for unknown providers
  }

  // Combine provider-specific fields with common fields like title
  const commonFields = [
    {
      name: "title",
      type: "text" as const,
      label: "Storage Title",
      required: true,
      schema: z.string().min(1, "Storage title is required"),
    },
  ];

  const allFields = [...commonFields, ...providerConfig.fields];
  return assembleSchema(allFields, isEditMode);
};

// Helper function to format validation errors in human-friendly format
export const formatValidationErrors = (zodError: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};

  zodError.errors.forEach((error) => {
    const fieldName = error.path.join(".");
    if (fieldName) {
      errors[fieldName] = error.message;
    }
  });

  return errors;
};
