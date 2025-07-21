import { Label } from "@humansignal/ui";
import { Input } from "apps/labelstudio/src/components/Form";
import { RadioGroup, RadioGroupItem } from "@humansignal/ui";

interface ProviderSelectionStepProps {
  formData: {
    title: string;
    provider: string;
  };
  errors: {
    provider?: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  setFormState: (updater: (prevState: any) => any) => void;
}

export const ProviderSelectionStep = ({
  formData,
  errors,
  handleChange,
  handleSelectChange,
  setFormState,
}: ProviderSelectionStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Choose your cloud storage provider</h2>
        <p className="text-muted-foreground">Select the cloud storage service where your data is stored</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Storage Title *</Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          style={{ width: "100%" }}
          placeholder="Enter a descriptive name (e.g., 'Legal Documents', 'Training Data')"
        />
        <p className="text-sm text-gray-500">This name will help you identify this connection in your project</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider">Storage Provider *</Label>
        <RadioGroup
          name="provider"
          value={formData.provider}
          onValueChange={(value) => handleSelectChange("provider", value)}
        >
          <label htmlFor="s3" className="block cursor-pointer">
            <div
              className={`flex items-center border rounded-md p-2 gap-4 hover:bg-gray-50
    ${formData.provider === "s3" ? "bg-blue-50 border-blue-200 ring-2 ring-blue-200 ring-opacity-50" : ""}`}
            >
              <RadioGroupItem value="s3" id="s3" className="ml-2" />
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

              <div>
                <span className="font-medium text-base block">Amazon S3</span>
                <p className="text-sm text-muted-foreground">AWS Simple Storage Service</p>
              </div>
            </div>
          </label>

          {/* GCP Option */}
          <label htmlFor="gcp" className="block cursor-pointer">
            <div
              className={`flex items-center border rounded-md p-2 gap-4 hover:bg-gray-50
    ${formData.provider === "gcp" ? "bg-green-50 border-green-200 ring-2 ring-green-200 ring-opacity-50" : ""}`}
            >
              <RadioGroupItem value="gcp" id="gcp" className="ml-2" />
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

              <div>
                <span className="font-medium text-base block">Google Cloud Storage</span>
                <p className="text-sm text-muted-foreground">Unified object storage for developers and enterprises</p>
              </div>
            </div>
          </label>

          {/* Azure Option */}
          <label htmlFor="azure" className="block cursor-pointer">
            <div
              className={`flex items-center border rounded-md p-2 gap-4 hover:bg-gray-50
    ${formData.provider === "azure" ? "bg-purple-50 border-purple-200 ring-2 ring-purple-200 ring-opacity-50" : ""}`}
            >
              <RadioGroupItem value="azure" id="azure" className="ml-2" />

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

              <div>
                <span className="font-medium text-base block">Azure Blob Storage</span>
                <p className="text-sm text-muted-foreground">Microsoft's object storage solution for the cloud</p>
              </div>
            </div>
          </label>
        </RadioGroup>

        {errors.provider && <p className="text-sm text-destructive">{errors.provider}</p>}
      </div>
    </div>
  );
};
