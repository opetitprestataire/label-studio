import { Label } from "@humansignal/ui";
import { useMemo, useEffect } from "react";
import { ProviderGrid } from "../components";

interface ProviderSelectionStepProps {
  formData: {
    provider: string;
  };
  errors: {
    provider?: string;
  };
  handleSelectChange: (name: string, value: string) => void;
  setFormState: (updater: (prevState: any) => any) => void;
  storageTypes?: any[];
  storageTypesLoading?: boolean;
  target?: "import" | "export";
}

export const ProviderSelectionStep = ({
  formData,
  errors,
  handleSelectChange,
  setFormState,
  storageTypes = [],
  storageTypesLoading = false,
  target = "import",
}: ProviderSelectionStepProps) => {
  // Process storage types data
  const storageTypeOptions = useMemo(() => {
    if (!storageTypes || !Array.isArray(storageTypes)) {
      return [];
    }

    return storageTypes;
  }, [storageTypes]);

  // Set default provider if none is selected and we have options
  useEffect(() => {
    if (!formData.provider && storageTypeOptions.length > 0) {
      handleSelectChange("provider", storageTypeOptions[0].name);
    }
  }, [storageTypeOptions, formData.provider, handleSelectChange]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Choose your cloud storage provider</h2>
        <p className="text-muted-foreground">Select the cloud storage service where your data is stored</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider" required>
          Storage Provider
        </Label>
        <ProviderGrid
          providers={storageTypeOptions}
          selectedProvider={formData.provider}
          onProviderSelect={(providerName) => handleSelectChange("provider", providerName)}
          disabled={storageTypesLoading}
          error={errors.provider}
        />
      </div>
    </div>
  );
};
