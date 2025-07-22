import { Label, Toggle, Select } from "@humansignal/ui";
import Counter from "apps/labelstudio/src/components/Form/Elements/Counter/Counter";
import { z } from "zod";
import { useCallback } from "react";
import Input from "apps/labelstudio/src/components/Form/Elements/Input/Input";

// S3 Form validation schema
const s3FormSchema = z.object({
  bucket: z.string().min(1, "Bucket name is required"),
  prefix: z.string().optional(),
  regex_filter: z.string().optional(),
  region_name: z.string().optional(),
  s3_endpoint: z.string().optional(),
  aws_access_key_id: z.string().min(1, "Access Key ID is required"),
  aws_secret_access_key: z.string().min(1, "Secret Access Key is required"),
  aws_session_token: z.string().optional(),
  use_blob_urls: z.boolean().default(true),
  presign: z.boolean().default(true),
  presign_ttl: z.number().min(1).max(10080).default(15),
  recursive_scan: z.boolean().default(true),
});

type S3FormData = z.infer<typeof s3FormSchema>;

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

export const S3 = ({ formData: mainFormData, handleProviderFieldChange, validationErrors = {} }: S3Props) => {
  // Use the main form data instead of local atom
  const formData = mainFormData || {};
  const localErrors = validationErrors;

  // Handle form data changes
  const handleChange = useCallback(
    (name: string, value: any) => {
      // Use the main form's handleProviderFieldChange
      handleProviderFieldChange?.(name, value);
    },
    [handleProviderFieldChange],
  );

  // Handle input change events
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const parsedValue = type === "number" ? Number(value) : value;
      handleProviderFieldChange?.(name, parsedValue);
    },
    [handleProviderFieldChange],
  );

  // Handle input blur events
  const handleInputBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Optional: Add any blur-specific logic here
  }, []);

  // Handle toggle change
  const handleToggleChange = useCallback(
    (name: string, checked: boolean) => {
      handleProviderFieldChange?.(name, checked);
    },
    [handleProviderFieldChange],
  );

  // Use external validation errors
  const displayErrors = validationErrors;

  // Debug: Log validation errors
  console.log("S3 validationErrors:", validationErrors);
  console.log("S3 displayErrors:", displayErrors);

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
    <div className="space-y-6">
      {/* Section 1: Bucket Name */}
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

      {/* Section 2: Bucket Prefix and File Filter */}
      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-2">
          <Input
            name="prefix"
            value={formData.prefix}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="path/to/files/"
            {...getInputProps("prefix", "Bucket Prefix")}
          />
        </div>

        <div className="space-y-2">
          <Input
            name="regex_filter"
            value={formData.regex_filter}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder=".*csv or .*(jpe?g|png|tiff) or .\\w+-\\d+.text"
            {...getInputProps("regex_filter", "File Filter Regex")}
          />
        </div>
      </div>

      {/* Section 3: AWS Configuration */}
      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-2">
          <Input
            name="region_name"
            value={formData.region_name}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="us-east-1"
            {...getInputProps("region_name", "Region Name")}
          />
        </div>

        <div className="space-y-2">
          <Input
            name="s3_endpoint"
            value={formData.s3_endpoint}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="https://s3.amazonaws.com"
            {...getInputProps("s3_endpoint", "S3 Endpoint")}
          />
        </div>
      </div>

      {/* Section 4: Credentials */}
      <div className="grid grid-cols-3 gap-6 items-start">
        <div className="space-y-2">
          <Input
            name="aws_access_key_id"
            type="password"
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

        <div className="space-y-2">
          <Input
            name="aws_session_token"
            type="password"
            value={formData.aws_session_token}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            autoComplete="new-password"
            placeholder="Session token (optional)"
            {...getInputProps("aws_session_token", "Session Token")}
          />
        </div>
      </div>

      {/* Section 5: Import Method */}
      <div className="space-y-2">
        <Label text="Import method" description="Choose how to import your data from storage"></Label>
        <Select
          name="use_blob_urls"
          value={formData.use_blob_urls ? "Files" : "JSON"}
          onChange={(value) => handleProviderFieldChange?.("use_blob_urls", value === "Files")}
          options={[
            {
              value: "Files",
              label: "Files - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT)",
            },
            {
              value: "JSON",
              label: "JSON - Treat each JSON or JSONL file as a task definition (one or more tasks per file)",
            },
          ]}
          placeholder="Select import method"
        />
      </div>

      {/* Section 6: Pre-signed URLs and Scan Settings */}
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start space-x-4">
            <Toggle
              checked={formData.presign}
              onChange={(e) => handleToggleChange("presign", e.target.checked)}
              aria-label="Use pre-signed URLs"
            />
            <div>
              <Label className="text-sm font-medium">Use pre-signed URLs (On)</Label>
              <p className="text-sm text-muted-foreground">Proxy through the platform (Off)</p>
              <p className="text-sm text-muted-foreground mt-1">
                When pre-signed URLs are enabled, all data bypasses the platform and user browsers directly read data
                from storage
              </p>
            </div>
          </div>

          <div>
            {formData.presign ? (
              <Counter
                name="presign_ttl"
                label="Expire pre-signed URLs (minutes)"
                value={formData.presign_ttl}
                min={1}
                max={10080}
                step={1}
                onChange={(e: any) => handleProviderFieldChange?.("presign_ttl", Number(e.target.value))}
                className=""
                validate=""
                required={false}
                skip={false}
                labelProps={{}}
              />
            ) : (
              <div className="opacity-50">
                <Counter
                  name="presign_ttl"
                  label="Expire pre-signed URLs (minutes)"
                  value={formData.presign_ttl}
                  min={1}
                  max={10080}
                  step={1}
                  onChange={() => {}} // No-op when disabled
                  className=""
                  validate=""
                  required={false}
                  skip={true}
                  labelProps={{}}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-4">
          <Toggle
            checked={formData.recursive_scan}
            onChange={(e) => handleToggleChange("recursive_scan", e.target.checked)}
            aria-label="Scan all sub-folders"
          />
          <div>
            <Label className="text-sm font-medium">Scan all sub-folders</Label>
            <p className="text-sm text-muted-foreground">Include files from all nested folders</p>
          </div>
        </div>
      </div>
    </div>
  );
};

S3.title = "AWS S3 Configuration";
S3.description = "Configure your AWS S3 connection with all required Label Studio settings";
