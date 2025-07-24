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
import { useMutation } from "@tanstack/react-query";

import { Button } from "@humansignal/ui";
import { ApiContext } from "apps/labelstudio/src/providers/ApiProvider";
import { isDefined } from "apps/labelstudio/src/utils/helpers";
import { IconCross } from "@humansignal/icons";
import { useModalControls } from "apps/labelstudio/src/components/Modal/ModalPopup";
import { useStorageCard } from "../hooks/useStorageCard";
import { Stepper, ProviderSelectionStep, ProviderDetailsStep, PreviewStep, ReviewStep } from "./Steps";
import { getProviderConfig, extractDefaultValues } from "./providers";
import { assembleSchema } from "./types/provider";

// Step validation schemas
const step1Schema = z.object({
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
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
  use_blob_urls: z.boolean().default(false),
  recursive_scan: z.boolean().default(true),
  regex_filter: z.string().optional(),
});

const gcpSchema = z.object({
  bucket: z.string().min(1, "Bucket name is required"),
  google_application_credentials: z.string().min(1, "Service Account Key is required"),
  project_id: z.string().optional(),
  prefix: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
  use_blob_urls: z.boolean().default(false),
  recursive_scan: z.boolean().default(true),
  regex_filter: z.string().optional(),
});

const azureSchema = z.object({
  container: z.string().min(1, "Container name is required"),
  account_name: z.string().min(1, "Storage Account Name is required"),
  account_key: z.string().min(1, "Storage Account Key is required"),
  sas_token: z.string().optional(),
  prefix: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
  use_blob_urls: z.boolean().default(false),
  recursive_scan: z.boolean().default(true),
  regex_filter: z.string().optional(),
});

const redisSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().min(1).max(65535, "Port must be between 1 and 65535"),
  db: z.number().min(0).max(15, "Database must be between 0 and 15"),
  password: z.string().optional(),
  prefix: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
  use_blob_urls: z.boolean().default(false),
  recursive_scan: z.boolean().default(true),
  regex_filter: z.string().optional(),
});

const localFilesSchema = z.object({
  path: z.string().min(1, "Path is required"),
  prefix: z.string().optional(),
  presign: z.boolean().default(false),
  presign_ttl: z.number().min(1).max(10080).optional(),
  use_blob_urls: z.boolean().default(false),
  recursive_scan: z.boolean().default(true),
  regex_filter: z.string().optional(),
});

// Combine all schemas
const formStateAtom = atom({
  currentStep: 0,
  formData: {
    project: 0, // Will be set properly in component
    provider: "s3",
    title: "", // Initialize title field to prevent uncontrolled input warning
    use_blob_urls: false, // Initialize import method field
    recursive_scan: true, // Initialize recursive scan field
    regex_filter: "", // Initialize file filter regex field
    // Other fields will be initialized dynamically based on provider
  },
  isComplete: false,
});

// Helper function to get provider-specific schema
const getProviderSchema = (provider: string, isEditMode: boolean = false) => {
  const providerConfig = getProviderConfig(provider);
  if (!providerConfig) {
    return z.object({}); // Empty schema for unknown providers
  }
  
  // Combine provider-specific fields with common fields like title
  const commonFields = [
    {
      name: "title",
      type: "text" as const,
      label: "Storage Title",
      required: true,
      schema: z.string().min(1, "Storage title is required"),
    },
  ];
  
  const allFields = [...commonFields, ...providerConfig.fields];
  return assembleSchema(allFields, isEditMode);
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
  const [type, setType] = useState<string>("s3");

  const [filesPreview, setFilesPreview] = useState(null);
  const [loadingFilesPreiview, setLoadingFilesPreiview] = useState(false);

  const [nextPreviewToken, setNextPreviewToken] = useState("");

  // Error state
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [connectionChecked, setConnectionChecked] = useState(false);

  const [formState, setFormState] = useAtom(formStateAtom);
  const { currentStep, formData } = formState;

  // Determine if we're in edit mode
  const isEditMode = Boolean(storage);

  // Fetch storage types
  const { storageTypes, storageTypesLoading } = useStorageCard(target, project);

  const action = useMemo(() => {
    return storage ? "updateStorage" : "createStorage";
  }, [storage]);

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (connectionData: any) => {
      if (!api) throw new Error("API context not available");

      // Clean the form data to remove empty access keys in edit mode
      const cleanedData = cleanFormDataForSubmission(connectionData);
      const body = { ...cleanedData };

      if (isDefined(storage?.id)) {
        body.id = storage.id;
      }

      const response = await api.callApi("validateStorage", {
        params: {
          target,
          type: formData.provider,
        },
        body,
      });

      return response;
    },
    onSuccess: (response) => {
      // Check if the response indicates success (200 status or $meta.ok)
      const isSuccess = response?.$meta?.ok || response?.$meta?.status === 200;
      setConnectionChecked(isSuccess);
    },
    onError: () => {
      setConnectionChecked(false);
    },
  });

  // Create/Update storage mutation
  const createStorageMutation = useMutation({
    mutationFn: async (storageData: any) => {
      if (!api) throw new Error("API context not available");

      // Clean the form data to remove empty access keys in edit mode
      const cleanedData = cleanFormDataForSubmission(storageData);
      const body = { ...cleanedData };

      if (isDefined(storage?.id)) {
        body.id = storage.id;
      }

      const response = await api.callApi(action, {
        params: { target, type: formData.provider, project, pk: storage?.id },
        body,
      });

      return response;
    },
    onSuccess: (response) => {
      if (response?.$meta?.ok) {
        onSubmit();
        handleClose();
      }
    },
    onError: (error) => {
      console.error("Failed to create/update storage:", error);
      // You might want to show an error message to the user here
    },
  });

  useEffect(() => {
    setFormState((prevState) => ({
      ...prevState,
      formData: {
        ...prevState.formData,
        project: project,
      },
    }));
  }, [project]); // Update when project prop changes

  // Initialize form data with provider defaults when provider changes
  useEffect(() => {
    if (formData.provider) {
      const providerConfig = getProviderConfig(formData.provider);
      if (providerConfig) {
        const defaultValues = extractDefaultValues(providerConfig.fields);
        setFormState((prevState) => ({
          ...prevState,
          formData: {
            ...prevState.formData,
            ...defaultValues,
          },
        }));
      }
    }
  }, [formData.provider]); // Update when provider changes

  // Initialize form data with existing storage data in edit mode
  useEffect(() => {
    if (isEditMode && storage) {
      const providerConfig = getProviderConfig(storage.type || storage.provider || "s3");
      
      // Prepare form data with placeholder values for access keys
      const formDataWithPlaceholders = { ...storage };
      
      if (providerConfig) {
        providerConfig.fields.forEach((field) => {
          if (field.accessKey) {
            // Fill access key fields with placeholder values in edit mode
            formDataWithPlaceholders[field.name] = "••••••••••••••••";
          }
        });
      }

      setFormState((prevState) => ({
        ...prevState,
        currentStep: 0, // Start from first step (Configure Connection in edit mode)
        formData: {
          ...prevState.formData,
          ...formDataWithPlaceholders, // Load existing storage data with placeholders
          provider: storage.type || storage.provider || "s3", // Ensure provider is set
        },
      }));
    }
  }, [isEditMode, storage, setFormState]);

  const setCurrentStep = (step: number) => {
    setFormState((prevState) => ({
      ...prevState,
      currentStep: step,
    }));
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow navigation to completed steps or the current step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const steps = isEditMode 
    ? [
        { title: "Configure Connection", schema: getProviderSchema(formData.provider, isEditMode) },
        { title: "Preview & Import Settings" },
        { title: "Review & Confirm" },
      ]
    : [
        { title: "Select Provider", schema: step1Schema },
        { title: "Configure Connection", schema: getProviderSchema(formData.provider, isEditMode) },
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
  const validateProviderFields = useCallback(
    (providerData: any) => {
      const providerSchema = getProviderSchema(formData.provider, isEditMode);

      try {
        providerSchema.parse(providerData);
        setErrors({});
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formattedErrors = formatValidationErrors(error);
          console.log("StorageFormNew validateProviderFields error:", formattedErrors);
          setErrors(formattedErrors);
          return false;
        }
        return false;
      }
    },
    [formData.provider, isEditMode],
  );

  // Handle provider field changes with validation
  const handleProviderFieldChange = useCallback(
    (name: string, value: any) => {
      const newFormData = { ...formData, [name]: value };

      setFormState((prev) => ({
        ...prev,
        formData: newFormData,
      }));

      // Validate provider fields in real-time
      validateProviderFields(newFormData);
    },
    [formData, setFormState, validateProviderFields],
  );



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
        createStorageMutation.mutate(formData);
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
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  // Helper function to clean form data for submission (remove empty access keys in edit mode)
  const cleanFormDataForSubmission = (data: any) => {
    if (!isEditMode) return data;

    const cleanedData = { ...data };
    const providerConfig = getProviderConfig(formData.provider);
    
    if (providerConfig) {
      // Remove empty access key fields in edit mode
      providerConfig.fields.forEach((field) => {
        if (field.accessKey && (
          cleanedData[field.name] === "" || 
          cleanedData[field.name] === undefined || 
          cleanedData[field.name] === "••••••••••••••••"
        )) {
          delete cleanedData[field.name];
        }
      });
    }

    return cleanedData;
  };

  const testStorageConnection = useCallback(async () => {
    // Validate the current step (provider configuration) first
    if (!validateCurrentStep()) {
      // Validation failed, don't proceed with connection test
      return;
    }

    console.log("Validation passed, testing connection...");
    // Use react-query mutation to test connection
    testConnectionMutation.mutate(formData);
  }, [formData, validateCurrentStep, testConnectionMutation, errors]);

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

    // Clean the form data to remove placeholder access keys in edit mode
    const cleanedData = cleanFormDataForSubmission(formData);
    const body = { ...cleanedData };

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
  }, [formState, target, storage, validateCurrentStep, cleanFormDataForSubmission]);

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

  const renderStepContent = () => {
    // In edit mode, step 0 is "Configure Connection", step 1 is "Preview & Import Settings", step 2 is "Review & Confirm"
    // In create mode, step 0 is "Select Provider", step 1 is "Configure Connection", step 2 is "Preview & Import Settings", step 3 is "Review & Confirm"
    const actualStep = isEditMode ? currentStep + 1 : currentStep;
    
    switch (actualStep) {
      case 0:
        return (
          <ProviderSelectionStep
            formData={formData}
            errors={errors}
            handleSelectChange={handleSelectChange}
            setFormState={setFormState}
            storageTypes={storageTypes}
            storageTypesLoading={storageTypesLoading}
            target={target}
          />
        );
      case 1:
        console.log("StorageFormNew passing errors to ProviderDetailsStep:", errors);
        console.log("Provider being passed:", formData.provider);
        return (
          <ProviderDetailsStep
            formData={formData}
            errors={errors}
            handleProviderFieldChange={handleProviderFieldChange}
            provider={formData.provider || "s3"}
            isEditMode={isEditMode}
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
        return <ReviewStep formData={formData} filesPreview={filesPreview} formatSize={formatSize} />;
      default:
        return null;
    }
  };

  const handleClose = () => {
    // Reset Jotai state to initial values
    setFormState({
      currentStep: 0,
      formData: {
        project: project,
        provider: "s3",
        title: "", // Reset title field
        use_blob_urls: false, // Reset import method field
        recursive_scan: true, // Reset recursive scan field
        regex_filter: "", // Reset file filter regex field
        // Other fields will be initialized by the useEffect when provider changes
      },
      isComplete: false,
    });

    // Reset local state
    setType(undefined);
    setFilesPreview(null);
    setLoadingFilesPreiview(false);
    setNextPreviewToken("");
    setErrors({});
    setConnectionChecked(false);

    onClose();
    modal?.hide();
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Custom header with title, subtitle and close button */}
      <div className="flex justify-between items-start px-wide py-base pt-wide">
        <div>
          <h2 className="m-0 mb-tight text-headline-large font-medium text-neutral-content">{title}</h2>
          {true && (
            <div className="text-body-medium text-neutral-content-subtle leading-relaxed">
              {"Import your data from cloud storage providers"}
            </div>
          )}
        </div>
        <Button leading={<IconCross />} look="string" onClick={handleClose} />
      </div>

      <Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />

      <div className="max-h-[60vh] overflow-y-auto px-wide py-base">{renderStepContent()}</div>

      <div className="flex items-center justify-between p-wide border-t border-neutral-border bg-neutral-background">
        <Button look="outlined" onClick={prevStep} disabled={currentStep === 0}>
          Previous
        </Button>

        <div className="flex gap-tight items-center">
          {(isEditMode ? currentStep === 0 : currentStep === 1) && (
            <>
              {connectionChecked && <span className="text-sm text-green-600 font-medium">✓ Connection successful</span>}
              <Button waiting={testConnectionMutation.isLoading} onClick={testStorageConnection}>
                Test Connection
              </Button>
            </>
          )}

          {(isEditMode ? currentStep === 1 : currentStep === 2) && (
            <Button waiting={loadingFilesPreiview} onClick={loadFilesPreview}>
              Load Preview
            </Button>
          )}

          <Button
            onClick={nextStep}
            waiting={currentStep === steps.length - 1 && createStorageMutation.isLoading}
            disabled={
              (isEditMode ? currentStep === 0 : currentStep === 1) && !connectionChecked ||
              (isEditMode ? currentStep === 1 : currentStep === 2) && filesPreview === null
            }
          >
            {currentStep < steps.length - 1 ? "Next" : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
});
