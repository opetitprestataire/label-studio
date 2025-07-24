import { cn } from "@humansignal/ui";

interface Provider {
  name: string;
  title: string;
}

interface ProviderGridProps {
  providers: Provider[];
  selectedProvider?: string;
  onProviderSelect: (providerName: string) => void;
  error?: string;
}

export const ProviderGrid = ({ providers, selectedProvider, onProviderSelect, error }: ProviderGridProps) => {
  // Get provider icon based on provider type
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "s3":
        return (
          <div className="h-8 w-8 bg-primary-emphasis rounded-md flex items-center justify-center text-primary-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-label="AWS S3 icon"
            >
              <path d="M4 20V8.5L12 4L20 8.5V20" />
              <path d="M2 8L12 16L22 8" />
              <path d="M12 16V21" />
            </svg>
          </div>
        );
      case "gcs":
        return (
          <div className="h-8 w-8 bg-primary-emphasis rounded-md flex items-center justify-center text-primary-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-label="Google Cloud Storage icon"
            >
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
          </div>
        );
      case "azure":
        return (
          <div className="h-8 w-8 bg-primary-emphasis rounded-md flex items-center justify-center text-primary-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-label="Microsoft Azure icon"
            >
              <path d="M12 22L2 17V7L12 2L22 7V17L12 22Z" />
              <path d="M12 2V22" />
              <path d="M2 7L22 7" />
              <path d="M2 17L22 17" />
            </svg>
          </div>
        );
      case "redis":
        return (
          <div className="h-8 w-8 bg-negative-emphasis rounded-md flex items-center justify-center text-negative-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-label="Redis icon"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
        );
      case "localfiles":
        return (
          <div className="h-8 w-8 bg-neutral-emphasis rounded-md flex items-center justify-center text-neutral-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-label="Local files icon"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 bg-neutral-emphasis rounded-md flex items-center justify-center text-neutral-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-label="Default storage icon"
            >
              <path d="M4 20V8.5L12 4L20 8.5V20" />
              <path d="M2 8L12 16L22 8" />
              <path d="M12 16V21" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="space-y-tight">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-tight">
        {providers.map((provider) => {
          const isSelected = selectedProvider === provider.name;

          return (
            <button
              key={provider.name}
              type="button"
              onClick={() => onProviderSelect(provider.name)}
              className={cn(
                "relative p-base border-2 rounded-lg transition-all duration-200 text-center",
                "hover:border-primary-border hover:bg-primary-emphasis-subtle",
                "focus:outline-none focus:ring-2 focus:ring-primary-focus-outline focus:ring-offset-2",
                "flex flex-col items-center space-y-tight",
                isSelected
                  ? "border-primary-border bg-primary-emphasis-subtle shadow-sm"
                  : "border-neutral-border hover:border-primary-border-subtle",
              )}
              aria-pressed={isSelected}
            >
              {getProviderIcon(provider.name)}
              <div className="flex-1 min-w-0">
                <h3 className="text-body-medium text-neutral-content truncate">{provider.title}</h3>
              </div>
              {isSelected && (
                <div className="absolute top-tighter right-tighter">
                  <svg
                    className="w-4 h-4 text-primary-content"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-label="Selected"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-body-small text-negative-content">{error}</p>}
    </div>
  );
};
