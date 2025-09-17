import { cn } from "@humansignal/ui";
import type { ProviderConfig } from "../types/provider";

interface ProviderGridProps {
  providers: Record<string, ProviderConfig>;
  selectedProvider?: string;
  onProviderSelect: (providerName: string) => void;
  error?: string;
}

export const ProviderGrid = ({ providers, selectedProvider, onProviderSelect, error }: ProviderGridProps) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-tight">
        {Object.entries(providers).map(([_, provider]) => {
          const isSelected = selectedProvider === provider.name;
          const isDisabled = provider.disabled;
          const Icon = provider.icon;

          return (
            <button
              key={provider.name}
              type="button"
              onClick={() => !isDisabled && onProviderSelect(provider.name)}
              disabled={isDisabled}
              data-testid={`storage-provider-${provider.name}`}
              className={cn(
                "relative p-base border-2 rounded-lg transition-all duration-200 text-center",
                "flex flex-col items-center gap-tight relative text-center",
                isDisabled
                  ? "border-neutral-border-subtle cursor-not-allowed bg-neutral-surface"
                  : [
                      "hover:border-primary-border-subtle hover:bg-primary-emphasis-subtle",
                      "hover:-translate-y-tightest focus:outline-none focus:ring-2 focus:ring-primary-focus-outline focus:ring-offset-2",
                      isSelected
                        ? "border-primary-border-subtle bg-primary-emphasis-subtle shadow-sm"
                        : "border-neutral-border hover:border-primary-border-subtle",
                    ],
              )}
              aria-pressed={isSelected}
              aria-disabled={isDisabled}
            >
              {Icon && <Icon className="w-8 h-8" />}
              <div className="flex-1 min-w-0 text-center">
                <h3
                  className={cn(
                    "text-body-medium truncate whitespace-pre",
                    isDisabled ? "text-neutral-content-subtler" : "text-neutral-content",
                  )}
                >
                  {provider.title}
                </h3>
                {provider.badge && (
                  <div className="mt-1 flex justify-center whitespace-pre absolute -bottom-tight left-1/2 -translate-x-[40px]">
                    {provider.badge}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-body-small text-negative-content">{error}</p>}
    </div>
  );
};
