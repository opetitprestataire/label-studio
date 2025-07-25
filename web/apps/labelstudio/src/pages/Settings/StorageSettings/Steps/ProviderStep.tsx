import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const renderBasicInfoStep = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold">Choose your cloud storage provider</h2>
      <p className="text-muted-foreground">Select the cloud storage service where your data is stored</p>
    </div>

    <div className="space-y-2">
      <Label htmlFor="connectionName">Connection Name</Label>
      <Input
        id="connectionName"
        name="connectionName"
        value={formData.connectionName}
        onChange={handleChange}
        placeholder="My Cloud Storage"
        className={errors.connectionName ? "border-destructive" : ""}
      />
      {errors.connectionName && <p className="text-sm text-destructive">{errors.connectionName}</p>}
    </div>

    <div className="space-y-2">
      <Label htmlFor="provider">Cloud Provider</Label>
      <RadioGroup
        id="provider"
        value={formData.provider}
        onValueChange={(value) => handleSelectChange("provider", value)}
        className="space-y-3"
      >
        {/* AWS Option */}
        <div
          className={cn(
            "flex items-center space-x-2 border rounded-lg p-4",
            formData.provider === "aws" ? "border-primary bg-primary/5" : "border-input hover:border-primary/50",
          )}
        >
          <RadioGroupItem value="aws" id="aws" className="sr-only" />
          <div className="h-10 w-10 bg-blue-100 rounded-md flex items-center justify-center text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M4 20V8.5L12 4L20 8.5V20"></path>
              <path d="M2 8L12 16L22 8"></path>
              <path d="M12 16V21"></path>
            </svg>
          </div>

          <div className="flex-grow">
            <Label htmlFor="aws" className="font-medium text-base cursor-pointer">
              AWS S3
            </Label>
            <p className="text-sm text-muted-foreground">Amazon Simple Storage Service</p>
          </div>

          <div className="h-5 w-5 rounded-full border flex items-center justify-center">
            {formData.provider === "aws" && <div className="h-3 w-3 rounded-full bg-primary"></div>}
          </div>
        </div>

        {/* GCP Option */}
        <div
          className={cn(
            "flex items-center space-x-2 border rounded-lg p-4",
            formData.provider === "gcp" ? "border-primary bg-primary/5" : "border-input hover:border-primary/50",
          )}
        >
          <RadioGroupItem value="gcp" id="gcp" className="sr-only" />
          <div className="h-10 w-10 bg-green-100 rounded-md flex items-center justify-center text-green-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
              <path d="M2 17L12 22L22 17"></path>
              <path d="M2 12L12 17L22 12"></path>
            </svg>
          </div>

          <div className="flex-grow">
            <Label htmlFor="gcp" className="font-medium text-base cursor-pointer">
              Google Cloud Storage
            </Label>
            <p className="text-sm text-muted-foreground">Unified object storage for developers and enterprises</p>
          </div>

          <div className="h-5 w-5 rounded-full border flex items-center justify-center">
            {formData.provider === "gcp" && <div className="h-3 w-3 rounded-full bg-primary"></div>}
          </div>
        </div>

        {/* Azure Option */}
        <div
          className={cn(
            "flex items-center space-x-2 border rounded-lg p-4",
            formData.provider === "azure" ? "border-primary bg-primary/5" : "border-input hover:border-primary/50",
          )}
        >
          <RadioGroupItem value="azure" id="azure" className="sr-only" />
          <div className="h-10 w-10 bg-purple-100 rounded-md flex items-center justify-center text-purple-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <path d="M12 22L2 17V7L12 2L22 7V17L12 22Z"></path>
              <path d="M12 2V22"></path>
              <path d="M2 7L22 7"></path>
              <path d="M2 17L22 17"></path>
            </svg>
          </div>

          <div className="flex-grow">
            <Label htmlFor="azure" className="font-medium text-base cursor-pointer">
              Azure Blob Storage
            </Label>
            <p className="text-sm text-muted-foreground">Microsoft's object storage solution for the cloud</p>
          </div>

          <div className="h-5 w-5 rounded-full border flex items-center justify-center">
            {formData.provider === "azure" && <div className="h-3 w-3 rounded-full bg-primary"></div>}
          </div>
        </div>
      </RadioGroup>

      {errors.provider && <p className="text-sm text-destructive">{errors.provider}</p>}
    </div>
  </div>
);
