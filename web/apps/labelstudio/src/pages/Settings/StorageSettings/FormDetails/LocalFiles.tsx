import { Label, Toggle } from "@humansignal/ui";
import { atom, useAtom } from "jotai";
import { z } from "zod";
import { useCallback, useEffect } from "react";

// LocalFiles Form validation schema
const localFilesFormSchema = z.object({
  path: z.string().min(1, "Path is required"),
  prefix: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

type LocalFilesFormData = z.infer<typeof localFilesFormSchema>;

// LocalFiles Form state atom
const localFilesFormAtom = atom<LocalFilesFormData>({
  path: "",
  prefix: "",
  regex_filter: "",
  presign: false,
  presign_ttl: 60,
});

// LocalFiles Form errors atom
const localFilesFormErrorsAtom = atom<Record<string, string>>({});

interface LocalFilesProps {
  formData?: any;
  setFormData?: (updater: (prev: any) => any) => void;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  initialData?: Partial<LocalFilesFormData>;
  onChange?: (data: LocalFilesFormData) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const LocalFiles = ({ initialData = {}, onChange, onValidationChange }: LocalFilesProps) => {
  const [formData, setFormData] = useAtom(localFilesFormAtom);
  const [errors, setErrors] = useAtom(localFilesFormErrorsAtom);

  // Initialize form data with initial values
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData, setFormData]);

  // Validate form data
  const validateForm = useCallback((data: LocalFilesFormData) => {
    try {
      localFilesFormSchema.parse(data);
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
      {/* Section 1: Path Configuration */}
      <div className="space-y-2">
        <Label htmlFor="path">Local Path *</Label>
        <input
          name="path"
          value={formData.path}
          onChange={handleInputChange}
          placeholder="/path/to/your/files"
          required
          style={{ width: "100%" }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.path && <p className="text-sm text-destructive">{errors.path}</p>}
        <p className="text-sm text-gray-500">Absolute path to the directory containing your files</p>
      </div>

      {/* Section 2: Configuration */}
      <div className="space-y-2">
        <Label htmlFor="prefix">Path Prefix</Label>
        <input
          id="prefix"
          name="prefix"
          value={formData.prefix}
          onChange={handleInputChange}
          placeholder="data/images/"
          style={{ width: "100%" }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500">Optional prefix to limit files to a specific subdirectory</p>
      </div>

      {/* Section 3: File Filter */}
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

      {/* Section 3: Additional Settings */}
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

LocalFiles.title = "Local Files Configuration";
LocalFiles.description = "Configure your local file system connection"; 