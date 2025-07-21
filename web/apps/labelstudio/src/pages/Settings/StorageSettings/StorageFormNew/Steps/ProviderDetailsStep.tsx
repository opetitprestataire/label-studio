import { Form, Input } from "apps/labelstudio/src/components/Form";
import { InlineError } from "apps/labelstudio/src/components/Error/InlineError";
import { S3 } from "apps/labelstudio/src/pages/Settings/StorageSettings/FormDetails/S3";

interface ProviderDetailsStepProps {
  formData: any;
  errors: {
    provider?: string;
  };
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  action: string;
  target: string;
  type: string;
  project: string;
  storage?: any;
  onSubmit: () => void;
  formRef: React.RefObject<any>;
}

export const ProviderDetailsStep = ({
  formData,
  errors,
  handleChange,
  action,
  target,
  type,
  project,
  storage,
  onSubmit,
  formRef,
}: ProviderDetailsStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">AWS S3 Configuration</h2>
        <p className="text-muted-foreground">
          Configure your AWS S3 connection with all required Label Studio settings
        </p>
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
        <Input type="hidden" name="project" value={project} />
        <S3 formData={formData} setFormData={() => {}} handleChange={handleChange} />
        <InlineError />
      </Form>

      {errors.provider && <p className="text-sm text-destructive">{errors.provider}</p>}
    </div>
  );
}; 