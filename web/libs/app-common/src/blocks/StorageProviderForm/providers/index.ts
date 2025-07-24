import { z } from "zod";
import { type ProviderConfig, assembleSchema, extractDefaultValues } from "../types/provider";
import { s3Provider } from "./s3";
import { gcsProvider } from "./gcs";
import { azureProvider } from "./azure";
import { redisProvider } from "./redis";
import { localFilesProvider } from "./localFiles";

// Registry of all available providers
export const providerRegistry: Record<string, ProviderConfig> = {
  s3: s3Provider,
  gcs: gcsProvider,
  azure: azureProvider,
  redis: redisProvider,
  localfiles: localFilesProvider,
};

// Helper function to get provider configuration
export function getProviderConfig(providerName?: string): ProviderConfig | undefined {
  if (!providerName) return undefined;
  return providerRegistry[providerName.toLowerCase()];
}

// Helper function to get provider schema
export function getProviderSchema(providerName: string) {
  const config = getProviderConfig(providerName);
  if (!config) {
    return z.object({}); // Empty schema for unknown providers
  }
  return assembleSchema(config.fields);
}

// Helper function to get default values for a provider
export function getProviderDefaultValues(providerName: string): Record<string, any> {
  const config = getProviderConfig(providerName);
  if (!config) {
    return {}; // Empty defaults for unknown providers
  }
  return extractDefaultValues(config.fields);
}

// Helper function to get all available providers
export function getAvailableProviders(): ProviderConfig[] {
  return Object.values(providerRegistry);
}

// Helper function to get provider by name
export function getProviderByName(name: string): ProviderConfig | undefined {
  return providerRegistry[name.toLowerCase()];
}

// Re-export extractDefaultValues for convenience
export { extractDefaultValues } from "../types/provider";
