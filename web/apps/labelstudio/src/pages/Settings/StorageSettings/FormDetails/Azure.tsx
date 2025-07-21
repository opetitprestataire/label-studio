import { Label, Toggle } from "@humansignal/ui";
import { atom, useAtom } from "jotai";
import { z } from "zod";
import { useCallback, useEffect } from "react";

// Azure Form validation schema
const azureFormSchema = z.object({
  container: z.string().min(1, "Container name is required"),
  prefix: z.string().optional(),
  account_name: z.string().min(1, "Storage Account Name is required"),
  account_key: z.string().min(1, "Storage Account Key is required"),
  sas_token: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

type AzureFormData = z.infer<typeof azureFormSchema>;

// Azure Form state atom
const azureFormAtom = atom<AzureFormData>({
  container: "",
  prefix: "",
  account_name: "",
  account_key: "",
  sas_token: "",
  regex_filter: "",
  presign: false,
  presign_ttl: 60,
});

// Azure Form errors atom
const azureFormErrorsAtom = atom<Record<string, string>>({});

interface AzureProps {
  formData?: any;
  setFormData?: (updater: (prev: any) => any) => void;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  initialData?: Partial<AzureFormData>;
  onChange?: (data: AzureFormData) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const Azure = ({ initialData = {}, onChange, onValidationChange }: AzureProps) => {
  const [formData, setFormData] = useAtom(azureFormAtom);
  const [errors, setErrors] = useAtom(azureFormErrorsAtom);

  // Initialize form data with initial values
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData, setFormData]);

  // Validate form data
  const validateForm = useCallback((data: AzureFormData) => {
    try {
      azureFormSchema.parse(data);
      setErrors({});
      onValidationChange?.(true);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        onValidationChange?.(false);
      }
      return false;
    }
  }, [setErrors, onValidationChange]);

  // Handle form data changes
  const handleChange = useCallback((name: string, value: any) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    validateForm(newFormData);
    onChange?.(newFormData);
  }, [formData, setFormData, validateForm, onChange]);

  // Handle input change events
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? Number(value) : value;
    handleChange(name, parsedValue);
  }, [handleChange]);

  // Handle toggle change
  const handleToggleChange = useCallback((name: string, checked: boolean) => {
    handleChange(name, checked);
  }, [handleChange]);

  return (
    <div className="space-y-8">
      {/* Section 1: Container Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="container">Container Name *</Label>
          <input
            name="container"
            value={formData.container}
            onChange={handleInputChange}
            placeholder="my-azure-container"
            required
            style={{ width: "100%" }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.container && <p className="text-sm text-destructive">{errors.container}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="account_name">Storage Account Name *</Label>
          <input
            id="account_name"
            name="account_name"
            value={formData.account_name}
            onChange={handleInputChange}
            placeholder="mystorageaccount"
            required
            style={{ width: "100%" }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.account_name && <p className="text-sm text-destructive">{errors.account_name}</p>}
        </div>
      </div>

      {/* Section 2: Credentials */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="account_key">Storage Account Key *</Label>
          <input
            id="account_key"
            name="account_key"
            type="password"
            value={formData.account_key}
            onChange={handleInputChange}
            autoComplete="new-password"
            placeholder="Your storage account key"
            required
            style={{ width: "100%" }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.account_key && <p className="text-sm text-destructive">{errors.account_key}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sas_token">SAS Token</Label>
          <input
            id="sas_token"
            name="sas_token"
            type="password"
            value={formData.sas_token}
            onChange={handleInputChange}
            autoComplete="new-password"
            placeholder="Optional SAS token"
            style={{ width: "100%" }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500">Optional Shared Access Signature token</p>
        </div>
      </div>

      {/* Section 3: Configuration */}
      <div className="space-y-2">
        <Label htmlFor="prefix">Container Prefix</Label>
        <input
          id="prefix"
          name="prefix"
          value={formData.prefix}
          onChange={handleInputChange}
          placeholder="data/images/"
          style={{ width: "100%" }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500">Optional prefix to limit files to a specific folder</p>
      </div>

      {/* Section 4: File Filter */}
      <div className="space-y-2">
        <Label htmlFor="regex_filter">File Filter Regex</Label>
        <input
          id="regex_filter"
          name="regex_filter"
          value={formData.regex_filter}
          onChange={handleInputChange}
          placeholder=".*\.(jpg|jpeg|png|gif)$"
          style={{ width: "100%" }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500">Optional regex pattern to filter files (e.g., .*\.(jpg|jpeg|png|gif)$ for images only)</p>
      </div>

      {/* Section 4: Additional Settings */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="presign">Use pre-signed URLs</Label>
              <p className="text-sm text-gray-500">Generate pre-signed URLs for secure file access</p>
            </div>
            <Toggle
              checked={formData.presign}
              onChange={e => handleToggleChange("presign", e.target.checked)}
            />
          </div>
        </div>

        {formData.presign && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="presign_ttl">Expiration Minutes</Label>
            <p className="text-sm text-gray-500">Minutes until pre-signed URLs expire (1-10080 minutes)</p>
            <div className="flex items-center space-x-2">
              <input
                id="presign_ttl"
                name="presign_ttl"
                type="number"
                min={1}
                max={10080}
                value={formData.presign_ttl}
                onChange={handleInputChange}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={formData.presign_ttl}
                onChange={(e) => handleChange("presign_ttl", Number(e.target.value))}
                className="flex-1"
              />
            </div>
            {errors.presign_ttl && <p className="text-sm text-destructive">{errors.presign_ttl}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

Azure.title = "Azure Blob Storage Configuration";
Azure.description = "Configure your Azure Blob Storage connection with all required Label Studio settings"; 