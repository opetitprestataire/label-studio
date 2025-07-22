import {
  type ChangeEventHandler,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { atom, useAtom } from "jotai";
import { z } from "zod";

import { Button } from "@humansignal/ui";
import { ApiContext } from "apps/labelstudio/src/providers/ApiProvider";
import { isDefined } from "apps/labelstudio/src/utils/helpers";
import { IconCross } from "@humansignal/icons";
import { useModalControls } from "apps/labelstudio/src/components/Modal/ModalPopup";
import { useStorageCard } from "../hooks/useStorageCard";
import { Stepper, ProviderSelectionStep, ProviderDetailsStep, PreviewStep, ReviewStep } from "./Steps";

// Step validation schemas
const step1Schema = z.object({
  title: z.string().min(1, "Storage title is required"),
  provider: z.string().min(1, "Please select a storage provider"),
});

// Provider-specific validation schemas
const s3Schema = z.object({
  bucket: z.string().min(1, "Bucket name is required"),
  aws_access_key_id: z.string().min(1, "Access Key ID is required"),
  aws_secret_access_key: z.string().min(1, "Secret Access Key is required"),
  region_name: z.string().optional(),
  aws_session_token: z.string().optional(),
  prefix: z.string().optional(),
  s3_endpoint: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

const gcpSchema = z.object({
  bucket: z.string().min(1, "Bucket name is required"),
  google_application_credentials: z.string().min(1, "Service Account Key is required"),
  project_id: z.string().optional(),
  prefix: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

const azureSchema = z.object({
  container: z.string().min(1, "Container name is required"),
  account_name: z.string().min(1, "Storage Account Name is required"),
  account_key: z.string().min(1, "Storage Account Key is required"),
  sas_token: z.string().optional(),
  prefix: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

const redisSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1).max(65535, "Port must be between 1 and 65535"),
  db: z.number().min(0).max(15, "Database must be between 0 and 15"),
  password: z.string().optional(),
  prefix: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

const localFilesSchema = z.object({
  path: z.string().min(1, "Path is required"),
  prefix: z.string().optional(),
  regex_filter: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
});

// Initial form state
const initialFormState = {
  currentStep: 0,
  formData: {
    project: 0,

    title: "", // Storage title
    provider: "s3",

    bucket: "", // Bucket Name *
    prefix: "", // Bucket Prefix

    region_name: "", // Region Name
    s3_endpoint: "", // S3 Endpoint

    aws_access_key_id: "", // Access Key ID *
    aws_secret_access_key: "", // Secret Access Key *

    aws_session_token: "",

    presign: false, // Use pre-signed URLs

    regex_filter: "",

    use_blob_urls: false,
    recursive_scan: true,
  },
  isComplete: false,
};

// Combine all schemas
const formStateAtom = atom(initialFormState);

// Helper function to get provider-specific schema
const getProviderSchema = (provider: string) => {
  switch (provider?.toLowerCase()) {
    case "s3":
    case "s3s":
      return s3Schema;
    case "gcp":
    case "gcs":
      return gcpSchema;
    case "azure":
      return azureSchema;
    case "redis":
      return redisSchema;
    case "localfiles":
      return localFilesSchema;
    default:
      return z.object({}); // Empty schema for unknown providers
  }
};

// Helper function to format validation errors in human-friendly format
const formatValidationErrors = (zodError: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  zodError.errors.forEach((error) => {
    const fieldName = error.path.join(".");
    if (fieldName) {
      errors[fieldName] = error.message;
    }
  });
  
  return errors;
};

export const StorageFormNew = forwardRef<
  unknown,
  {
    onSubmit: () => void;
    target?: string;
    project?: any;
    storage?: any;
    title?: string;
    onClose?: () => void;
  }
>(({ onSubmit, target, project, storage, title, onClose = () => {} }, ref) => {
  console.log({ target });
  const api = useContext(ApiContext);
  const modal = useModalControls();
  const formRef = ref ?? useRef();
  const [type, setType] = useState<string>();

  const [filesPreview, setFilesPreview] = useState(null);
  const [loadingFilesPreiview, setLoadingFilesPreiview] = useState(false);

  const [nextPreviewToken, setNextPreviewToken] = useState("");

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);

  const [formState, setFormState] = useAtom(formStateAtom);
  const { currentStep, formData } = formState;

  // Fetch storage types
  const { storageTypes, storageTypesLoading } = useStorageCard(target, project);

  useEffect(() => {
    setFormState((prevState) => ({
      ...prevState,
      formData: {
        ...prevState.formData,
        project: project,
      },
    }));
  }, []); // Empty dependency array means this runs once on component mount

  const setCurrentStep = (step: number) => {
    setFormState((prevState) => ({
      ...prevState,
      currentStep: step,
    }));
  };

  const steps = [
    { title: "Select Provider", schema: step1Schema },
    { title: "Configure Connection", schema: getProviderSchema(formData.provider) },
    { title: "Preview & Import Settings" },
    { title: "Review & Confirm" },
  ];

  // Validate current step
  const validateCurrentStep = useCallback(() => {
    const currentSchema = steps[currentStep]?.schema;
    
    if (!currentSchema) {
      return true; // No validation for steps without schema
    }

    try {
      currentSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationErrors(error);
        setErrors(formattedErrors);
        return false;
      }
      return false;
    }
  }, [currentStep, formData, steps]);

  // Validate specific provider fields
  const validateProviderFields = useCallback((providerData: any) => {
    const providerSchema = getProviderSchema(formData.provider);
    
    try {
      providerSchema.parse(providerData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationErrors(error);
        console.log('StorageFormNew validateProviderFields error:', formattedErrors);
        setErrors(formattedErrors);
        return false;
      }
      return false;
    }
  }, [formData.provider]);

  // Handle provider field changes with validation
  const handleProviderFieldChange = useCallback((name: string, value: any) => {
    const newFormData = { ...formData, [name]: value };
    
    setFormState((prev) => ({
      ...prev,
      formData: newFormData,
    }));

    // Validate provider fields in real-time
    validateProviderFields(newFormData);
  }, [formData, setFormState, validateProviderFields]);

  // Validate step 1 fields (title and provider)
  const validateStep1Fields = useCallback((stepData: any) => {
    try {
      step1Schema.parse(stepData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationErrors(error);
        setErrors(formattedErrors);
        return false;
      }
      return false;
    }
  }, []);

  // Handle step 1 field changes with validation
  const handleStep1FieldChange = useCallback((name: string, value: any) => {
    const newFormData = { ...formData, [name]: value };
    
    setFormState((prev) => ({
      ...prev,
      formData: newFormData,
    }));

    // Validate step 1 fields in real-time
    validateStep1Fields(newFormData);
  }, [formData, setFormState, validateStep1Fields]);

  const handleChange: ChangeEventHandler = (e) => {
    const { name, value } = e.target as HTMLInputElement;

    setFormState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value,
      },
    }));

    // Clear error for this field when it changes
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setType(value);

    setFormState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value,
      },
    }));

    // Clear error for this field when it changes
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Submit the form
        console.log("Form submitted with data:", formData);
        // Here you would typically make an API call
        alert("Form submitted successfully!");
      }
    }
  };

  // Go to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Format the file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / (k ** i)).toFixed(2))} ${sizes[i]}`;
  };

  const testStorageConnection = useCallback(async () => {
    // Validate the current step (provider configuration) first
    if (!validateCurrentStep()) {
      // Validation failed, don't proceed with connection test
      return;
    }

    // TODO should be real
    setConnectionChecked(true);
  }, [formState, target, storage, validateCurrentStep]);

  const loadFilesPreview = useCallback(async () => {
    // Validate the current step first
    if (!validateCurrentStep()) {
      // Validation failed, don't proceed with loading preview
      return;
    }

    setLoadingFilesPreiview(true);
    // setChecking(true);
    // setConnectionValid(null);

    // Get the form data directly from Atom state
    const { formData } = formState;

    // TODO this needs to be dynamic
    const type = "s3";

    const body = { ...formData };

    if (isDefined(storage?.id)) {
      body.id = storage.id;
    }

    // Use your API service directly instead of form.api
    // You might need to adapt this to your actual API service
    const response = await api.callApi("storageFiles", {
      params: {
        limit: 10,
        target,
        type,
      },
      body,
    });

    // const fl = [
    //   { "key": "hello/world.jpg", last_modified: "2024", size: 423748 },
    //   { "key": "yo/hello/world.jpg", last_modified: "2025", size: 3748 }
    // ]

    // for (let i = 0; i<10000; i++) {
    //   fl.push({ "key": "hello/world.jpg", last_modified: "2024", size: 423748 });
    // }

    // const response = { "files": fl };

    setFilesPreview(response?.files);
    setNextPreviewToken(response?.continuation_token);
    setLoadingFilesPreiview(false);
    // if (response?.$meta?.ok) setConnectionValid(true);
    // else setConnectionValid(false);

    // setChecking(false);
  }, [formState, target, storage, validateCurrentStep]);

  // const validateConnection = useCallback(async () => {
  //   setChecking(true);
  //   setConnectionValid(null);

  //   const form = formRef.current;

  //   if (form && form.validateFields()) {
  //     const body = formData form.assembleFormData({ asJSON: true });
  //     const type = form.getField("storage_type").value;

  //     if (isDefined(storage?.id)) {
  //       body.id = storage.id;
  //     }

  //     // we're using api provided by the form to be able to save
  //     // current api context and render inline erorrs properly
  //     const response = await form.api.callApi("storageFiles", {
  //       params: {
  //         target,
  //         type,
  //       },
  //       body,
  //     });

  //     if (response?.$meta?.ok) setConnectionValid(true);
  //     else setConnectionValid(false);
  //   }
  //   setChecking(false);
  // }, [formRef, target, type, storage]);

  // const RadioButtonContent = ({ value, label, description }) => {
  //   // The component will re-render when RadioButton re-renders
  //   // and will receive the current checked state
  //   return (
  //     <Label placement="right" text={label} description={description}>
  //       <input
  //         type="radio"
  //         value={value}
  //     // Instead of hardcoding true, we leave this out
  //     // The RadioButton component will handle the checked state automatically
  //         readOnly
  //         style={{ pointerEvents: "none" }}
  //       />
  //     </Label>
  //   );
  // };

  const action = useMemo(() => {
    return storage ? "updateStorage" : "createStorage";
  }, [storage]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <ProviderSelectionStep
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleSelectChange={handleSelectChange}
            handleStep1FieldChange={handleStep1FieldChange}
            setFormState={setFormState}
            storageTypes={storageTypes}
            storageTypesLoading={storageTypesLoading}
            target={target}
          />
        );
      case 1:
        console.log('StorageFormNew passing errors to ProviderDetailsStep:', errors);
        return (
          <ProviderDetailsStep
            formData={formData}
            errors={errors}
            handleChange={handleChange}
            handleProviderFieldChange={handleProviderFieldChange}
            action={action}
            target={target}
            type={type}
            project={project}
            storage={storage}
            onSubmit={onSubmit}
            formRef={formRef}
          />
        );
      case 2:
        return (
          <PreviewStep
            formData={formData}
            formState={formState}
            setFormState={setFormState}
            handleChange={handleChange}
            action={action}
            target={target}
            type={type}
            project={project}
            storage={storage}
            onSubmit={onSubmit}
            formRef={formRef}
            filesPreview={filesPreview}
            formatSize={formatSize}
          />
        );
      case 3:
        return <ReviewStep />;
      default:
        return null;
    }
  };

  const handleClose = () => {
    // Reset Jotai state to initial values
    setFormState(initialFormState);
    
    // Reset local state
    setType(undefined);
    setFilesPreview(null);
    setLoadingFilesPreiview(false);
    setNextPreviewToken("");
    setErrors({});
    setTestingConnection(false);
    setConnectionChecked(false);
    
    onClose();
    modal?.hide();
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Custom header with title, subtitle and close button */}
      <div className="flex justify-between items-start px-wide py-base pt-wide">
        <div>
          <h2 className="m-0 mb-tight text-headline-large font-medium text-neutral-content">
            {title}
          </h2>
          {true && (
            <div className="text-body-medium text-neutral-content-subtle leading-relaxed">
              {"Import your data from cloud storage providers"}
            </div>
          )}
        </div>
        <Button leading={<IconCross />} look="string" onClick={handleClose} />
      </div>

      <Stepper steps={steps} currentStep={currentStep} />

      <div className="max-h-[60vh] overflow-y-auto px-wide py-base">
        {renderStepContent()}
      </div>

      <div className="flex items-center justify-between p-wide border-t border-neutral-border bg-neutral-background">
        <Button look="outlined" onClick={prevStep} disabled={currentStep === 0}>
          Previous
        </Button>

        <div className="flex gap-tight">
          {currentStep === 1 && (
            <Button waiting={testingConnection} onClick={testStorageConnection}>
              Test Connection
            </Button>
          )}

          {currentStep === 2 && (
            <Button waiting={loadingFilesPreiview} onClick={loadFilesPreview}>
              Load Preview
            </Button>
          )}

          <Button
            onClick={nextStep}
            disabled={(currentStep === 1 && !connectionChecked) || (currentStep === 2 && filesPreview === null)}
          >
            {currentStep < steps.length - 1 ? "Next" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
});
