import { Label, Toggle } from "@humansignal/ui";
import { atom, useAtom } from "jotai";
import { z } from "zod";
import { useCallback, useEffect } from "react";
import Input from "apps/labelstudio/src/components/Form/Elements/Input/Input";

// GCP Form validation schema
const gcpFormSchema = z.object({
  bucket: z.string().min(1, "Bucket name is required"),
  prefix: z.string().optional(),
  google_application_credentials: z.string().min(1, "Service Account Key is required"),
  project_id: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

type GCPFormData = z.infer<typeof gcpFormSchema>;

// GCP Form state atom
const gcpFormAtom = atom<GCPFormData>({
  bucket: "",
  prefix: "",
  google_application_credentials: "",
  project_id: "",
  regex_filter: "",
  presign: false,
  presign_ttl: 60,
});

// GCP Form errors atom
const gcpFormErrorsAtom = atom<Record<string, string>>({});

interface GCPProps {
  formData?: any;
  setFormData?: (updater: (prev: any) => any) => void;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProviderFieldChange?: (name: string, value: any) => void;
  initialData?: Partial<GCPFormData>;
  onChange?: (data: GCPFormData) => void;
  onValidationChange?: (isValid: boolean) => void;
  validationErrors?: Record<string, string>;
}

export const GCP = ({ initialData = {}, onChange, onValidationChange, validationErrors = {}, handleProviderFieldChange }: GCPProps) => {
  const [formData, setFormData] = useAtom(gcpFormAtom);
  const [localErrors, setLocalErrors] = useAtom(gcpFormErrorsAtom);

  // Initialize form data with initial values
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData, setFormData]);

  // Validate form data
  const validateForm = useCallback((data: GCPFormData) => {
    try {
      gcpFormSchema.parse(data);
      setLocalErrors({});
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
        setLocalErrors(newErrors);
        onValidationChange?.(false);
      }
      return false;
    }
  }, [setLocalErrors, onValidationChange]);

  // Handle form data changes
  const handleChange = useCallback((name: string, value: any) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    validateForm(newFormData);
    onChange?.(newFormData);
  }, [formData, setFormData, validateForm, onChange]);

  // Handle input change events
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? Number(value) : value;
    
    // Use centralized validation if available, otherwise use local validation
    if (handleProviderFieldChange) {
      handleProviderFieldChange(name, parsedValue);
    } else {
      const newFormData = { ...formData, [name]: parsedValue };
      setFormData(newFormData);
      validateForm(newFormData);
      onChange?.(newFormData);
    }
  }, [formData, setFormData, validateForm, onChange, handleProviderFieldChange]);

  // Handle input blur events for validation
  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? Number(value) : value;
    const newFormData = { ...formData, [name]: parsedValue };
    validateForm(newFormData);
  }, [formData, validateForm]);

  // Handle toggle change
  const handleToggleChange = useCallback((name: string, checked: boolean) => {
    handleChange(name, checked);
  }, [handleChange]);

  // Use external validation errors if provided, otherwise use local errors
  const displayErrors = Object.keys(validationErrors).length > 0 ? validationErrors : localErrors;

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
    footer: displayErrors[fieldName] || "",
    className: displayErrors[fieldName] ? 'border-red-500' : '',
  });

  return (
    <div className="space-y-8">
      {/* Section 1: Bucket Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Input
            name="bucket"
            value={formData.bucket}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="my-gcp-bucket"
            {...getInputProps('bucket', 'Bucket Name *', true)}
          />
        </div>

        <div className="space-y-2">
          <Input
            id="project_id"
            name="project_id"
            value={formData.project_id}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="my-gcp-project"
            {...getInputProps('project_id', 'Project ID')}
            description="Optional GCP project ID"
          />
        </div>
      </div>

      {/* Section 2: Credentials */}
      <div className="space-y-2">
        <Input
          id="google_application_credentials"
          name="google_application_credentials"
          value={formData.google_application_credentials}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="Paste your JSON service account key here..."
          {...getInputProps('google_application_credentials', 'Service Account Key *', true)}
          description="Paste the entire JSON content of your service account key file"
        />
      </div>

      {/* Section 3: Configuration */}
      <div className="space-y-2">
        <Input
          id="prefix"
          name="prefix"
          value={formData.prefix}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder="data/images/"
          {...getInputProps('prefix', 'Bucket Prefix')}
          description="Optional prefix to limit files to a specific folder"
        />
      </div>

      {/* Section 4: File Filter */}
      <div className="space-y-2">
        <Input
          id="regex_filter"
          name="regex_filter"
          value={formData.regex_filter}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder=".*\.(jpg|jpeg|png|gif)$"
          {...getInputProps('regex_filter', 'File Filter Regex')}
          description="Optional regex pattern to filter files (e.g., .*\.(jpg|jpeg|png|gif)$ for images only)"
        />
      </div>

      {/* Section 5: Additional Settings */}
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
              <Input
                id="presign_ttl"
                name="presign_ttl"
                type="number"
                min={1}
                max={10080}
                value={formData.presign_ttl}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                {...getInputProps('presign_ttl', 'Expiration Minutes')}
                className={`w-24 ${displayErrors.presign_ttl ? 'border-red-500' : ''}`}
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
          </div>
        )}
      </div>
    </div>
  );
};

GCP.title = "Google Cloud Storage Configuration";
GCP.description = "Configure your Google Cloud Storage connection with all required Label Studio settings"; 