import { Label, Select } from "@humansignal/ui";
import { useMemo, useEffect, useCallback } from "react";
import Input from "apps/labelstudio/src/components/Form/Elements/Input/Input";

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
  // Get provider display name
  const getProviderDisplayName = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "s3":
        return "Amazon S3";
      case "gcp":
        return "Google Cloud Storage";
      case "azure":
        return "Azure Blob Storage";
      default:
        return provider;
    }
  };

  // Process storage types data
  const storageTypeOptions = useMemo(() => {
    if (!storageTypes || !Array.isArray(storageTypes)) {
      return [];
    }

    return storageTypes.map(
      (storageType: any) =>
        ({
          label: storageType.title,
          value: storageType.name,
        }) as const,
    );
  }, [storageTypes]);

  // Set default provider if none is selected and we have options
  useEffect(() => {
    if (!formData.provider && storageTypeOptions.length > 0) {
      handleSelectChange("provider", storageTypeOptions[0].value);
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

  // Get provider icon based on provider type
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "s3":
        return (
          <div className="h-6 w-6 bg-blue-100 rounded-md flex items-center justify-center text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-label="S3 icon"
            >
              <path d="M4 20V8.5L12 4L20 8.5V20" />
              <path d="M2 8L12 16L22 8" />
              <path d="M12 16V21" />
            </svg>
          </div>
        );
      case "gcp":
        return (
          <div className="h-6 w-6 bg-green-100 rounded-md flex items-center justify-center text-green-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-label="GCP icon"
            >
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
          </div>
        );
      case "azure":
        return (
          <div className="h-6 w-6 bg-purple-100 rounded-md flex items-center justify-center text-purple-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
              aria-label="Azure icon"
            >
              <path d="M12 22L2 17V7L12 2L22 7V17L12 22Z" />
              <path d="M12 2V22" />
              <path d="M2 7L22 7" />
              <path d="M2 17L22 17" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-6 w-6 bg-gray-100 rounded-md flex items-center justify-center text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
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
        <Select
          value={formData.provider ?? storageTypeOptions[0].value ?? "s3"}
          options={storageTypeOptions}
          onChange={(value) => handleSelectChange("provider", value)}
          disabled={storageTypesLoading}
        />

        {errors.provider && <p className="text-sm text-destructive">{errors.provider}</p>}
      </div>
    </div>
  );
};
