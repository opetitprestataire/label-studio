import { Label } from "@humansignal/ui";
import { useMemo, useEffect, useCallback } from "react";
import Input from "apps/labelstudio/src/components/Form/Elements/Input/Input";
import { ProviderGrid } from "../components";

interface ProviderSelectionStepProps {
  formData: {
    title: string;
    provider: string;
  };
  errors: {
    provider?: string;
    title?: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleStep1FieldChange: (name: string, value: any) => void;
  setFormState: (updater: (prevState: any) => any) => void;
  storageTypes?: any[];
  storageTypesLoading?: boolean;
  target?: "import" | "export";
  onValidationChange?: (isValid: boolean) => void;
}

export const ProviderSelectionStep = ({
  formData,
  errors,
  handleChange,
  handleSelectChange,
  handleStep1FieldChange,
  setFormState,
  storageTypes = [],
  storageTypesLoading = false,
  target = "import",
  onValidationChange,
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

  // Handle input blur for validation
  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      // Trigger validation on blur
      onValidationChange?.(Object.keys(errors).length === 0);
    },
    [errors, onValidationChange],
  );

  // Handle input change for real-time validation
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;

      // Use centralized validation if available, otherwise use local validation
      if (handleStep1FieldChange) {
        handleStep1FieldChange(name, value);
      } else {
        // Fallback to local validation
        onValidationChange?.(Object.keys(errors).length === 0);
      }
    },
    [errors, onValidationChange, handleStep1FieldChange],
  );

  // Default props for Input component
  const getInputProps = (fieldName: string, label: string, required = false) => ({
    validate: "",
    skip: false,
    labelProps: {},
    ghost: false,
    tooltip: "",
    tooltipIcon: null,
    required,
    label,
    description: "",
    footer: errors[fieldName as keyof typeof errors] || "",
    className: errors[fieldName as keyof typeof errors] ? "border-red-500" : "",
  });



  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Choose your cloud storage provider</h2>
        <p className="text-muted-foreground">Select the cloud storage service where your data is stored</p>
      </div>

      <div className="space-y-2">
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          onBlur={handleInputBlur}
          placeholder="Enter a descriptive name (e.g., 'Legal Documents', 'Training Data')"
          {...getInputProps("title", "Storage Title", true)}
          description="This name will help you identify this connection in your project"
        />
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
