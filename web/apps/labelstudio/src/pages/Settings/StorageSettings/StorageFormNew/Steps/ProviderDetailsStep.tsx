import { Form, Input } from "apps/labelstudio/src/components/Form";
import { InlineError } from "apps/labelstudio/src/components/Error/InlineError";
import { S3 } from "apps/labelstudio/src/pages/Settings/StorageSettings/FormDetails/S3";
import { GCP } from "apps/labelstudio/src/pages/Settings/StorageSettings/FormDetails/GCP";
import { Azure } from "apps/labelstudio/src/pages/Settings/StorageSettings/FormDetails/Azure";
import { Redis } from "apps/labelstudio/src/pages/Settings/StorageSettings/FormDetails/Redis";
import { LocalFiles } from "apps/labelstudio/src/pages/Settings/StorageSettings/FormDetails/LocalFiles";

interface ProviderDetailsStepProps {
  formData: any;
  errors: Record<string, string>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProviderFieldChange: (name: string, value: any) => void;
  action: string;
  target: string;
  type: string;
  project: string;
  storage?: any;
  onSubmit: () => void;
  formRef: React.RefObject<any>;
}

// Provider form components mapping
const providerComponents = {
  s3: S3,
  s3s: S3,
  gcp: GCP,
  gcs: GCP,
  azure: Azure,
  redis: Redis,
  localfiles: LocalFiles,
};

// Provider display names
const providerDisplayNames = {
  s3: "AWS S3",
  s3s: "AWS S3",
  gcp: "Google Cloud Storage",
  gcs: "Google Cloud Storage",
  azure: "Azure Blob Storage",
  redis: "Redis",
  localfiles: "Local Files",
};

// Provider descriptions
const providerDescriptions = {
  s3: "Configure your AWS S3 connection with all required Label Studio settings",
  s3s: "Configure your AWS S3 connection with all required Label Studio settings",
  gcp: "Configure your Google Cloud Storage connection with all required Label Studio settings",
  gcs: "Configure your Google Cloud Storage connection with all required Label Studio settings",
  azure: "Configure your Azure Blob Storage connection with all required Label Studio settings",
  redis: "Configure your Redis connection for file storage",
  localfiles: "Configure your local file system connection",
};

export const ProviderDetailsStep = ({
  formData,
  errors,
  handleChange,
  handleProviderFieldChange,
  action,
  target,
  type,
  project,
  storage,
  onSubmit,
  formRef,
}: ProviderDetailsStepProps) => {
  console.log('ProviderDetailsStep received errors:', errors);
  
  const selectedProvider = formData.provider?.toLowerCase() as keyof typeof providerComponents;
  const ProviderComponent = selectedProvider ? providerComponents[selectedProvider] : null;
  const displayName = selectedProvider ? providerDisplayNames[selectedProvider] : "Storage Configuration";
  const description = selectedProvider ? providerDescriptions[selectedProvider] : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{displayName}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Form
        ref={formRef}
        action={action}
        params={{ target, type, project, pk: storage?.id }}
        formData={{ ...(storage ?? {}) }}
        skipEmpty={false}
        onSubmit={onSubmit}
        autoFill="off"
        autoComplete="off"
      >
        <Input 
          type="hidden" 
          name="project" 
          value={project}
          label=""
          description=""
          footer=""
          className=""
          validate=""
          required={false}
          skip={false}
          labelProps={{}}
          ghost={false}
          tooltip=""
          tooltipIcon={null}
        />
        
        {ProviderComponent ? (
          <ProviderComponent 
            formData={formData} 
            setFormData={() => {}} 
            handleChange={handleChange} 
            handleProviderFieldChange={handleProviderFieldChange}
            validationErrors={errors}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please select a storage provider first</p>
          </div>
        )}
        
        <InlineError 
          children={null}
          includeValidation={true}
          className=""
          style={{}}
        />
      </Form>

    </div>
  );
}; 