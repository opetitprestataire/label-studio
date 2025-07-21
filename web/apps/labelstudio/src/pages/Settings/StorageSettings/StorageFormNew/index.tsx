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
import { cn } from "@humansignal/shad/utils";
import { z } from "zod";

import { Button } from "@humansignal/ui";
import { InlineError } from "apps/labelstudio/src/components/Error/InlineError";
import { Form, Input } from "apps/labelstudio/src/components/Form";
import { ApiContext } from "apps/labelstudio/src/providers/ApiProvider";
import { isDefined } from "apps/labelstudio/src/utils/helpers";
import { Label, Toggle } from "@humansignal/ui";
import { RadioGroup, RadioGroupItem } from "@humansignal/shad/components/ui/radio-group";
import { IconCross, IconDocument, IconSearch } from "@humansignal/icons";
import { S3 } from "../../FormDetails/S3";
import { formatDistanceToNow } from "date-fns";
import { useModalControls } from "apps/labelstudio/src/components/Modal/ModalPopup";
import {
  Stepper,
  ProviderSelectionStep,
  ProviderDetailsStep,
  PreviewStep,
  ReviewStep,
} from "./Steps";



// Step validation schemas
const basicInfoSchema = z.object({
  connectionName: z.string().min(1, "Storage title is required"),
  provider: z.enum(["s3", "gcp", "azure"], {
    required_error: "Please select a cloud provider",
  }),
});

const storageDetailsSchema = z.object({
  bucketName: z.string().min(1, "Bucket Name is required"),
  bucketPrefix: z.string().optional(),
  region: z.string().optional(),
  endpoint: z.string().optional(),
  accessKeyId: z.string().min(1, "Access Key ID is required"),
  secretKey: z.string().min(1, "Secret Access Key is required"),
  sessionToken: z.string().optional(),
  usePresignedUrls: z.boolean().default(false),
});

// Combine all schemas
const formStateAtom = atom({
  currentStep: 0,
  formData: {
    project: 0,

    title: "", // Storage title
    provider: "",

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
});

export const StorageFormNew = forwardRef<
  unknown,
  {
    onSubmit: () => void;
  }
>(({ onSubmit, target, project, storage, title, onClose = () => {} }, ref) => {
  /**@type {import('react').RefObject<Form>} */
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
    { title: "Select Provider", schema: basicInfoSchema },
    { title: "Configure Connection", schema: storageDetailsSchema },
    { title: "Preview & Import Settings" },
    { title: "Review & Confirm" },
  ];

  // Get current schema based on step

  const handleChange: ChangeEventHandler = (e) => {
    const { name, value } = e.target as HTMLInputElement;

    setFormState((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value,
      },
    }));

    // setFormData(prev => ({
    //   ...prev,
    //   [name]: value
    // }));

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
    // if (errors[name]) {
    //   setErrors(prev => {
    //     const newErrors = {...prev};
    //     delete newErrors[name];
    //     return newErrors;
    //   });
    // }
  };

  // Validate current step

  const nextStep = () => {
    //if (validateStep()) {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit the form
      console.log("Form submitted with data:", formData);
      // Here you would typically make an API call
      alert("Form submitted successfully!");
    }
    //}
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
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const testStorageConnection = useCallback(async () => {
    // TODO should be real
    setConnectionChecked(true);
  }, [formState, target, storage]);

  const loadFilesPreview = useCallback(async () => {
    setLoadingFilesPreiview(true);
    // setChecking(true);
    // setConnectionValid(null);

    // Get the form data directly from Atom state
    const { formData } = formState;

    // TODO this needs to be dynamic
    const type = "s3";

    // Check if the form data is valid
    // You might need to implement a validation logic here
    const isFormValid = true; // Replace with actual validation check

    if (isFormValid) {
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
    }

    // setChecking(false);
  }, [formState, target, storage]);

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
            setFormState={setFormState}
          />
        );
      case 1:
        return (
          <ProviderDetailsStep
            formData={formData}
            errors={errors}
            handleChange={handleChange}
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
    onClose();
    modal?.hide();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Custom header with title, subtitle and close button */}
      <div
        style={{
          padding: "1rem 1.5rem",
          paddingTop: "1.5rem",

          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.75rem",
              fontWeight: "500",
              color: "var(--color-neutral-content)",
            }}
          >
            {title}
          </h2>
          {true && (
            <div
              style={{
                fontSize: "1rem",
                color: "var(--color-neutral-content-subtle)",
                lineHeight: "1.4",
              }}
            >
              {"Import your data from cloud storage providers"}
            </div>
          )}
        </div>
        <Button leading={<IconCross />} look="string" onClick={handleClose} />
      </div>

      <Stepper steps={steps} currentStep={currentStep} />

      <div
        style={{
          maxHeight: "60vh", // Adjust height as needed
          overflowY: "auto", // This enables vertical scrolling
          padding: "1rem 1.5rem",
        }}
      >
        {renderStepContent()}
      </div>

      <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
        <Button look="outlined" onClick={prevStep} disabled={currentStep === 0}>
          Previous
        </Button>

        <div className="flex" style={{ gap: "12px" }}>
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
