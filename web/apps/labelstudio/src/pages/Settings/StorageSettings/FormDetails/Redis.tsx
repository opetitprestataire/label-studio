import { Label, Toggle } from "@humansignal/ui";
import { atom, useAtom } from "jotai";
import { z } from "zod";
import { useCallback, useEffect } from "react";

// Redis Form validation schema
const redisFormSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1).max(65535, "Port must be between 1 and 65535"),
  db: z.number().min(0).max(15, "Database must be between 0 and 15"),
  password: z.string().optional(),
  prefix: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

type RedisFormData = z.infer<typeof redisFormSchema>;

// Redis Form state atom
const redisFormAtom = atom<RedisFormData>({
  host: "",
  port: 6379,
  db: 0,
  password: "",
  prefix: "",
  regex_filter: "",
  presign: false,
  presign_ttl: 60,
});

// Redis Form errors atom
const redisFormErrorsAtom = atom<Record<string, string>>({});

interface RedisProps {
  formData?: any;
  setFormData?: (updater: (prev: any) => any) => void;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  initialData?: Partial<RedisFormData>;
  onChange?: (data: RedisFormData) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const Redis = ({ initialData = {}, onChange, onValidationChange }: RedisProps) => {
  const [formData, setFormData] = useAtom(redisFormAtom);
  const [errors, setErrors] = useAtom(redisFormErrorsAtom);

  // Initialize form data with initial values
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData, setFormData]);

  // Validate form data
  const validateForm = useCallback((data: RedisFormData) => {
    try {
      redisFormSchema.parse(data);
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
      {/* Section 1: Connection Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="host">Host *</Label>
          <input
            name="host"
            value={formData.host}
            onChange={handleInputChange}
            placeholder="localhost"
            required
            style={{ width: "100%" }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.host && <p className="text-sm text-destructive">{errors.host}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="port">Port *</Label>
          <input
            id="port"
            name="port"
            type="number"
            value={formData.port}
            onChange={handleInputChange}
            placeholder="6379"
            min={1}
            max={65535}
            required
            style={{ width: "100%" }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.port && <p className="text-sm text-destructive">{errors.port}</p>}
        </div>
      </div>

      {/* Section 2: Database Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="db">Database *</Label>
          <input
            id="db"
            name="db"
            type="number"
            value={formData.db}
            onChange={handleInputChange}
            placeholder="0"
            min={0}
            max={15}
            required
            style={{ width: "100%" }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.db && <p className="text-sm text-destructive">{errors.db}</p>}
          <p className="text-sm text-gray-500">Redis database number (0-15)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            autoComplete="new-password"
            placeholder="Optional Redis password"
            style={{ width: "100%" }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500">Optional Redis authentication password</p>
        </div>
      </div>

      {/* Section 3: Configuration */}
      <div className="space-y-2">
        <Label htmlFor="prefix">Key Prefix</Label>
        <input
          id="prefix"
          name="prefix"
          value={formData.prefix}
          onChange={handleInputChange}
          placeholder="ls:files:"
          style={{ width: "100%" }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-sm text-gray-500">Optional prefix for Redis keys</p>
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

Redis.title = "Redis Configuration";
Redis.description = "Configure your Redis connection for file storage"; 