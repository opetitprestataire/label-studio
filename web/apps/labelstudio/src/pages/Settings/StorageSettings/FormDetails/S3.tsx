import { Label, Toggle } from "@humansignal/ui";
import { atom, useAtom } from "jotai";
import { z } from "zod";
import { useCallback, useEffect } from "react";
import Input from "apps/labelstudio/src/components/Form/Elements/Input/Input";

// S3 Form validation schema
const s3FormSchema = z.object({
  bucket: z.string().min(1, "Bucket name is required"),
  region_name: z.string().optional(),
  aws_access_key_id: z.string().min(1, "Access Key ID is required"),
  aws_secret_access_key: z.string().min(1, "Secret Access Key is required"),
  aws_session_token: z.string().optional(),
  prefix: z.string().optional(),
  s3_endpoint: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

type S3FormData = z.infer<typeof s3FormSchema>;

// S3 Form state atom
const s3FormAtom = atom<S3FormData>({
  bucket: "",
  region_name: "",
  aws_access_key_id: "",
  aws_secret_access_key: "",
  aws_session_token: "",
  prefix: "",
  s3_endpoint: "",
  regex_filter: "",
  presign: false,
  presign_ttl: 60,
});

// S3 Form errors atom
const s3FormErrorsAtom = atom<Record<string, string>>({});

interface S3Props {
  formData?: any;
  setFormData?: (updater: (prev: any) => any) => void;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProviderFieldChange?: (name: string, value: any) => void;
  initialData?: Partial<S3FormData>;
  onChange?: (data: S3FormData) => void;
  onValidationChange?: (isValid: boolean) => void;
  validationErrors?: Record<string, string>;
}

export const S3 = ({
  initialData = {},
  onChange,
  onValidationChange,
  validationErrors = {},
  handleProviderFieldChange,
}: S3Props) => {
  const [formData, setFormData] = useAtom(s3FormAtom);
  const [localErrors, setLocalErrors] = useAtom(s3FormErrorsAtom);

  // Initialize form data with initial values
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData, setFormData]);

  // Validate form data
  const validateForm = useCallback(
    (data: S3FormData) => {
      try {
        s3FormSchema.parse(data);
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
    },
    [setLocalErrors, onValidationChange],
  );

  // Handle form data changes
  const handleChange = useCallback(
    (name: string, value: any) => {
      const newFormData = { ...formData, [name]: value };
      setFormData(newFormData);
      validateForm(newFormData);
      onChange?.(newFormData);
    },
    [formData, setFormData, validateForm, onChange],
  );

  // Handle input change events
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const parsedValue = type === "number" ? Number(value) : value;

      // Use centralized validation if available, otherwise use local validation
      if (handleProviderFieldChange) {
        handleProviderFieldChange(name, parsedValue);
      } else {
        const newFormData = { ...formData, [name]: parsedValue };
        setFormData(newFormData);
        validateForm(newFormData);
        onChange?.(newFormData);
      }
    },
    [formData, setFormData, validateForm, onChange, handleProviderFieldChange],
  );

  // Handle input blur events for validation
  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const parsedValue = type === "number" ? Number(value) : value;
      const newFormData = { ...formData, [name]: parsedValue };
      validateForm(newFormData);
    },
    [formData, validateForm],
  );

  // Handle toggle change
  const handleToggleChange = useCallback(
    (name: string, checked: boolean) => {
      handleChange(name, checked);
    },
    [handleChange],
  );

  // Use external validation errors if provided, otherwise use local errors
  const displayErrors = Object.keys(validationErrors).length > 0 ? validationErrors : localErrors;

  // Debug: Log validation errors
  console.log('S3 validationErrors:', validationErrors);
  console.log('S3 localErrors:', localErrors);
  console.log('S3 displayErrors:', displayErrors);

  // Default props for Input component
  const getInputProps = (fieldName: string, label: string, required = false) => {
    const footer = displayErrors[fieldName] || "";
    console.log(`S3 getInputProps for ${fieldName}:`, { footer, hasError: !!displayErrors[fieldName] });
    return {
      validate: "",
      skip: false,
      labelProps: {},
      ghost: false,
      tooltip: "",
      tooltipIcon: null,
      required,
      label,
      description: "",
      footer,
      className: displayErrors[fieldName] ? "border-red-500" : "",
    };
  };

  return (
    <div className="space-y-8">
      {/* Section 2: Bucket Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Input
            name="bucket"
            value={formData.bucket}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="my-storage-bucket"
            {...getInputProps("bucket", "Bucket Name", true)}
          />
        </div>

        <div className="space-y-2">
          <Input
            id="region_name"
            name="region_name"
            value={formData.region_name}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="us-east-1"
            {...getInputProps("region_name", "Region Name")}
          />
        </div>
      </div>

      {/* Section 4: Credentials */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Input
            id="aws_access_key_id"
            name="aws_access_key_id"
            type="text"
            value={formData.aws_access_key_id}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            autoComplete="off"
            placeholder="AKIAIOSFODNN7EXAMPLE"
            {...getInputProps("aws_access_key_id", "Access Key ID", true)}
          />
        </div>

        <div className="space-y-2">
          <Input
            id="aws_secret_access_key"
            name="aws_secret_access_key"
            type="password"
            value={formData.aws_secret_access_key}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            autoComplete="new-password"
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            {...getInputProps("aws_secret_access_key", "Secret Access Key", true)}
          />
        </div>
      </div>

      {/* Section 3: AWS Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Input
            id="prefix"
            name="prefix"
            value={formData.prefix}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="data/images/"
            {...getInputProps("prefix", "Bucket Prefix")}
            description="Optional prefix to limit files to a specific folder"
          />
        </div>

        <div className="space-y-2">
          <Input
            id="s3_endpoint"
            name="s3_endpoint"
            value={formData.s3_endpoint}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="https://s3.amazon.aws.com"
            {...getInputProps("s3_endpoint", "Custom Endpoint")}
            description="For S3-compatible storage (leave empty for AWS S3)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Input
          id="aws_session_token"
          name="aws_session_token"
          type="password"
          value={formData.aws_session_token}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          autoComplete="new-password"
          {...getInputProps("aws_session_token", "Session Token")}
          description="Optional session token for temporary AWS credentials"
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
          {...getInputProps("regex_filter", "File Filter Regex")}
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
            <Toggle checked={formData.presign} onChange={(e) => handleToggleChange("presign", e.target.checked)} />
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
                {...getInputProps("presign_ttl", "Expiration Minutes")}
                className={`w-24 ${displayErrors.presign_ttl ? "border-red-500" : ""}`}
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

S3.title = "AWS S3 Configuration";
S3.description = "Configure your AWS S3 connection with all required Label Studio settings";
