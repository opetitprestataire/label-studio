import { Label, Toggle } from "@humansignal/ui";
import { Input } from "../../../../components/Form";

export const S3 = ({ formData, setFormData, handleChange }) => {
  return (
    <div className="space-y-8">
      {/* Section 2: Bucket Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="bucket">Bucket Name *</Label>
          <Input
            id="bucket"
            name="bucket"
            value={formData.bucket}
            onChange={handleChange}
            placeholder="my-storage-bucket"
            required
            style={{ width: "100%" }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="region_name">Region Name</Label>
          <Input
            id="region_name"
            name="region_name"
            value={formData.region_name}
            onChange={handleChange}
            placeholder="us-east-1"
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Section 4: Credentials */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="aws_access_key_id">Access Key ID *</Label>
          <Input
            id="aws_access_key_id"
            name="aws_access_key_id"
            type="input"
            value={formData.aws_access_key_id}
            onChange={handleChange}
            autoComplete="off"
            placeholder="AKIAIOSFODNN7EXAMPLE"
            required
            style={{ width: "100%" }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="aws_secret_access_key">Secret Access Key *</Label>
          <Input
            id="aws_secret_access_key"
            name="aws_secret_access_key"
            type="input"
            value={formData.aws_secret_access_key}
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            required
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Section 3: AWS Configuration */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="prefix">Bucket Prefix</Label>
          <Input
            id="prefix"
            name="prefix"
            value={formData.prefix}
            onChange={handleChange}
            placeholder="data/images/"
            style={{ width: "100%" }}
          />
          <p className="text-sm text-gray-500">Optional prefix to limit files to a specific folder</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="s3_endpoint">Custom Endpoint</Label>
          <Input
            id="s3_endpoint"
            name="s3_endpoint"
            value={formData.s3_endpoint}
            onChange={handleChange}
            placeholder="https://s3.amazon.aws.com"
            style={{ width: "100%" }}
          />
          <p className="text-sm text-gray-500">For S3-compatible storage (leave empty for AWS S3)</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aws_session_token">Session Token</Label>
        <Input
          id="aws_session_token"
          name="aws_session_token"
          type="password"
          value={formData.aws_session_token}
          onChange={handleChange}
          autoComplete="new-password"
          style={{ width: "100%" }}
        />
        <p className="text-sm text-gray-500">Optional session token for temporary AWS credentials</p>
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
              id="presign"
              name="presign"
              checked={formData.presign}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, presign: checked }))}
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
                onChange={(e) => handleChange("presign_ttl", Number.parseInt(e.target.value))}
                className="w-24"
              />
              <input
                type="range"
                min={1}
                max={60}
                step={1}
                value={[formData.presign_ttl]}
                onChange={(value) => handleChange("presign_ttl", value[0])}
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
