import { forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState, React } from "react";
import { atom, useAtom } from 'jotai';
import { cn } from "@humansignal/shad/utils";
import { z } from 'zod';

// import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from "@humansignal/ui";
import { InlineError } from "../../../components/Error/InlineError";
import { Form, Input } from "../../../components/Form";
import { Oneof } from "../../../components/Oneof/Oneof";
import { ApiContext } from "../../../providers/ApiProvider";
import { Block, Elem } from "../../../utils/bem";
import { isDefined } from "../../../utils/helpers";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@humansignal/shad/components/ui/card";
import { Label, Toggle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@humansignal/ui";
import { RadioGroup, RadioGroupItem } from "@humansignal/shad/components/ui/radio-group";
import { IconCross, IconDocument, IconSearch } from "@humansignal/icons";
import { S3 } from "./FormDetails/S3";
import { formatDistanceToNow, format } from 'date-fns';
import { Toast, ToastProvider, ToastViewport } from "@radix-ui/react-toast";


const Stepper = ({ steps, currentStep }) => {
  return (
    <div className="w-full mb-2 py-4" style={{ background: "rgb(248 250 252)", padding: "1rem 1.5rem", borderBottom: "1px solid var(--color-neutral-border)" }}>
      <div className="flex flex-col">
        {/* Step circles and names */}
        <div className="flex justify-between items-start mb-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-sm text-sm border mr-2",
                  currentStep > index 
                    ? "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200" // completed
                    : currentStep === index 
                      ? "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200" // current
                      : "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 bg-white border-2 border-slate-200 text-slate-400" // upcoming
                )}
              >
                {currentStep > index ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={cn(
                "text-sm",
                currentStep >= index ? "text-primary font-sm" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
            </div>
          ))}
        </div>
        
        {/* Progress bar */}
        <div className="relative w-full overflow-hidden rounded-full h-1 bg-slate-200">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 rounded-full"
            style={{ 
              width: `${(Math.min(currentStep, steps.length - 1) / (steps.length - 1)) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};


// Step validation schemas
const basicInfoSchema = z.object({
  connectionName: z.string().min(1, "Storage title is required"),
  provider: z.enum(["s3", "gcp", "azure"], { 
    required_error: "Please select a cloud provider" 
  })
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

const previewDetailsSchema = z.object({
  fileFilterRegex: z.string().optional(),
  importAllAsDataSources: z.boolean().default(false),
  recursiveScan: z.boolean().default(false)
  
  // apiKey: z.string().min(8, "API key must be at least 8 characters"),
  // secretKey: z.string().min(8, "Secret key must be at least 8 characters")
});

// Combine all schemas
const formSchema = basicInfoSchema.merge(storageDetailsSchema).merge(previewDetailsSchema);

// {"project":"106076","title":"asfdsdaf","bucket":"asdfsadfsadf","prefix":"asdfasdfsadf","regex_filter":"","region_name":"asdfsadf","s3_endpoint":"asdfsadf","aws_access_key_id":"got ya, suspisadfasdfcious hacker!","aws_secret_access_key":"got ya, suspasdfasdficious hacker!","aws_session_token":"got sadfsadfya, suspicious hacker!","use_blob_urls":false,"recursive_scan":false,"presign":true,"presign_ttl":"15"}

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
    isComplete: false
  });


export const StorageFormNew = forwardRef(({ onSubmit, target, project, rootClass, storage, storageTypes, title, onClose = () => {} }, ref) => {
  /**@type {import('react').RefObject<Form>} */
  const api = useContext(ApiContext);
  const formRef = ref ?? useRef();
  const [type, setType] = useState();
  const [checking, setChecking] = useState(false);
  const [connectionValid, setConnectionValid] = useState(null);
  const [formFields, setFormFields] = useState([]);
  
  const [filesPreview, setFilesPreview] = useState(null);
  const [ loadingFilesPreiview, setLoadingFilesPreiview ] = useState(false);
  
  const [nextPreviewToken, setNextPreviewToken] = useState("");
  
  useEffect(() => {
    console.log("type changed: " + type); 
    api
      .callApi("storageForms", {
        params: {
          target,
          type,
        },
      })
      .then((formFields) => setFormFields(formFields ?? []));;
  }, [type]);

  // Error state
  const [errors, setErrors] = useState({});

  const [ testingConnection, setTestingConnection ] = useState(false);
  const [ connectionChecked, setConnectionChecked ] = useState(false);
    
  const [ formState, setFormState ] = useAtom(formStateAtom);
  const { currentStep, formData } = formState;

  useEffect(() => {
    setFormState(prevState => ({
      ...prevState,
      formData: {
        ...prevState.formData,
        project: project
      }
    }));
  }, []); // Empty dependency array means this runs once on component mount

  
  const setCurrentStep = (step) => {
    setFormState((prevState) => ({
      ...prevState,
      currentStep: step
    }));
  } 
  
  const steps = [
    { title: "Select Provider", schema: basicInfoSchema },
    { title: "Configure Connection", schema: storageDetailsSchema },
    { title: "Preview & Import Settings" },
    { title: "Review & Confirm" }
  ];

  // Get current schema based on step
  const currentSchema = steps[currentStep].schema || z.object({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value
      }
    }));
    
    // setFormData(prev => ({
    //   ...prev,
    //   [name]: value
    // }));
    
    // Clear error for this field when it changes
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // Handle select changes
  const handleSelectChange = (name, value) => {
    setType(value);

    setFormState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value
      }
    }));
    
    // setFormState(prevState => ({
    //   ...prevState,
    //   formData: {
    //     ...prevState.formData,
    //     provider: "s3"
    //   }
    // }));
    
    // setFormData(prev => ({
    //   ...prev,
    //   [name]: value
    // }));
    
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
  const validateStep = () => {
    // No validation for review step
    if (currentStep === steps.length - 1) return true;
    
    const schema = steps[currentStep].schema;
    try {
      // Extract only the fields relevant to current step
      const currentData = {};
      Object.keys(schema.shape).forEach(key => {
        currentData[key] = formData[key];
      });
      
      // Validate with Zod
      schema.parse(currentData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Transform Zod errors into a field-error map
        const newErrors = {};
        error.errors.forEach(err => {
          // Remove the first part of the path (which is just the field name)
          const fieldName = err.path[0];
          newErrors[fieldName] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };
  
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
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    const type = 's3';

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

  
  const renderProviderSelectionStep = () => (
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
          onValueChange={(value) => handleSelectChange("provider", value)}>
          <label htmlFor="s3" className="block cursor-pointer">
            <div className={`flex items-center border rounded-md p-2 gap-4 hover:bg-gray-50 
      ${formData.provider === "s3" ? "bg-blue-50 border-blue-200 ring-2 ring-blue-200 ring-opacity-50" : ""}`}>
              <RadioGroupItem value="s3" id="s3" className="ml-2" />
              <div className="h-10 w-10 bg-blue-100 rounded-md flex items-center justify-center text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
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
            <div className={`flex items-center border rounded-md p-2 gap-4 hover:bg-gray-50
      ${formData.provider === "gcp" ? "bg-green-50 border-green-200 ring-2 ring-green-200 ring-opacity-50" : ""}`}>
              <RadioGroupItem value="gcp" id="gcp" className="ml-2" />
              <div className="h-10 w-10 bg-green-100 rounded-md flex items-center justify-center text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
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
            <div className={`flex items-center border rounded-md p-2 gap-4 hover:bg-gray-50
      ${formData.provider === "azure" ? "bg-purple-50 border-purple-200 ring-2 ring-purple-200 ring-opacity-50" : ""}`}>
              <RadioGroupItem value="azure" id="azure" className="ml-2" />
              
              <div className="h-10 w-10 bg-purple-100 rounded-md flex items-center justify-center text-purple-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
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
        
        {errors.provider && (
          <p className="text-sm text-destructive">{errors.provider}</p>
        )}
      </div>
    </div>
  );

  const action = useMemo(() => {
    return storage ? "updateStorage" : "createStorage";
  }, [storage]);

  const renderProviderDetails = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">AWS S3 Configuration</h2>
          <p className="text-muted-foreground">Configure your AWS S3 connection with all required Label Studio settings</p>
        </div>

        <Form ref={formRef}
              action={action}
              params={{ target, type, project, pk: storage?.id }}
              formData={{ ...(storage ?? {}) }}
              skipEmpty={false}
              onSubmit={onSubmit}
              autoFill="off"
              autoComplete="off">
          <Input type="hidden" name="project" value={project} />
          <S3 formData={formData} setFormData={() => {}} handleChange={handleChange} />
          <InlineError />
        </Form>
        
        {errors.provider && (
          <p className="text-sm text-destructive">{errors.provider}</p>
        )}
      </div>
    );
  };

  const renderPreviewStep = () => {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Configure Import Settings & Preview Data</h2>
          <p className="text-muted-foreground">Set up filters for your files and preview what will be synchronized</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column Header */}
          <h4>Import Configuration</h4>
          
          {/* Right Column Header with Button */}
          <div className="flex justify-between items-center">
            <h4>Files Preview</h4>          
          </div>
          
          {/* Left Column: Configuration */}
          <div>
            <Form
              ref={formRef}
              action={action}
              params={{ target, type, project, pk: storage?.id }}
      /* fields={[...(formFields ?? [])]} */
              formData={{ ...(storage ?? {}) }}
              skipEmpty={false}
              onSubmit={onSubmit}
              autoFill="off"
              autoComplete="off">
              
              <div className="space-y-8">
                {/* File Filter Section */}
                <div className="space-y-2">
                  <Label htmlFor="regex_filter">File Name Filter (Optional)</Label>
                  <div>
                    <Input 
                      id="regex_filter"
                      name="regex_filter"
                      value={formData.regex_filter}
                      onChange={handleChange}
                      placeholder=".*\.(jpg|png)$ - imports only JPG, PNG files"
                      style={{ width: "100%" }}
                    />
                    
                    <div className="flex flex-wrap gap-x-2 items-center text-xs">
                      <span className="text-muted-foreground">Common filters:</span>
                      <a 
                        href="#" 
                        className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormState(prevState => ({
                            ...prevState,
                            formData: {
                              ...prevState.formData,
                              regex_filter: ".*\.(jpe?g|png|gif)$"
                            }
                          }));
                        }}
                      >
                        Images
                      </a>
                      <a 
                        href="#" 
                        className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormState(prevState => ({
                            ...prevState,
                            formData: {
                              ...prevState.formData,
                              regex_filter: ".*\\.(mp4|avi|mov|wmv|webm)$"
                            }
                          }));
                        }}
                      >
                        Videos
                      </a>
                      <a 
                        href="#" 
                        className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormState(prevState => ({
                            ...prevState,
                            formData: {
                              ...prevState.formData,
                              regex_filter: ".*\\.(mp3|wav|ogg|flac)$"
                            }
                          }));
                        }}
                      >
                        Audio
                      </a>
                      <a 
                        href="#" 
                        className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormState(prevState => ({
                            ...prevState,
                            formData: {
                              ...prevState.formData,
                              regex_filter: ".*\\.(csv|tsv)$"
                            }
                          }));
                        }}
                      >
                        Tabular
                      </a>
                      <a 
                        href="#" 
                        className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormState(prevState => ({
                            ...prevState,
                            formData: {
                              ...prevState.formData,
                              regex_filter: ".*\\.(txt|html|xml)$"
                            }
                          }));
                        }}
                      >
                        Text
                      </a>
                      <a 
                        href="#" 
                        className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormState(prevState => ({
                            ...prevState,
                            formData: {
                              ...prevState.formData,
                              regex_filter: ".*\\.pdf$"
                            }
                          }));
                        }}
                      >
                        PDFs
                      </a>
                      <a 
                        href="#" 
                        className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormState(prevState => ({
                            ...prevState,
                            formData: {
                              ...prevState.formData,
                              regex_filter: ".*\\.json$"
                            }
                          }));
                        }}
                      >
                        JSON
                      </a>
                      <a 
                        href="#" 
                        className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormState(prevState => ({
                            ...prevState,
                            formData: {
                              ...prevState.formData,
                              regex_filter: ".*"
                            }
                          }));
                        }}
                      >
                        All Files
                      </a>
                    </div>
                  </div>
                </div>

                {/* Import Options */}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="use_blob_urls" className="block mb-2">
                      Import as source files
                    </Label>
                    <span className="text-sm text-gray-500 leading-tight block">
                      Files will be imported as source data (images, text, etc.) rather than annotation tasks (JSON)
                    </span>
                  </div>
                  <Toggle
                    id="use_blob_urls"
                    name="use_blob_urls"
                    checked={formState.formData.use_blob_urls}
                    onCheckedChange={(checked) => 
                      setFormState(prevState => ({
                        ...prevState,
                        formData: {
                          ...prevState.formData,
                          use_blob_urls: checked
                        }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="recursive_scan" className="block mb-2">
                      Include subfolders
                    </Label>
                    <p className="text-sm text-gray-500">
                      Scan all subdirectories within the bucket or folder path
                    </p>
                  </div>
                  <Toggle 
                    id="recursive_scan"
                    name="recursive_scan"
                    checked={formState.formData.recursive_scan}
                    onCheckedChange={(checked) => 
                      setFormState(prevState => ({
                        ...prevState,
                        formData: {
                          ...prevState.formData,
                          recursive_scan: checked
                        }
                      }))
                    } 
                  />
                </div>              
              </div>
            </Form>
          </div>

          {/* Right Column: Preview Files */}
          <div className="border rounded-md overflow-hidden h-[340px]">
            <div className="bg-card h-full flex flex-col">
              {filesPreview === null ? (
                // No API response yet
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center flex-grow">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <IconDocument className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No Preview Available</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Configure your import settings and click "Load Preview" to see a sample of files that will be imported.
                  </p>
                </div>
              ) : filesPreview.length === 0 ? (
                // API returned empty array
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center flex-grow">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <IconSearch className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">No Files Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    No files matching your current criteria were found. Try adjusting your filter settings and reload the preview. 
                  </p>
                </div>
              ) : (
                // Files available - display in a table format with fixed height and scrolling
                <div className="px-2 py-2 flex-grow overflow-auto">
                  <div className="grid grid-cols-1 text-xs gap-1">
                    {filesPreview.map((file, index) => (
                      <div key={index} className="flex justify-between py-0.5 px-2 bg-gray-50 hover:bg-gray-100 border-b last:border-b-0 rounded-md">
                        <div className="truncate max-w-[260px]">{file.key}</div>
                        <div className="flex items-center space-x-1 text-muted-foreground whitespace-nowrap">
                          <span>{formatDistanceToNow(new Date(file.last_modified), {addSuffix: true})}</span>
                          <span className="mx-0.5">•</span>
                          <span>{formatSize(file.size)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  
  const renderReviewStep = () => {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Ready to Connect</h2>
          <p className="text-gray-600 mt-1">
            Review your connection details and confirm to start importing
          </p>
        </div>

        {/* Connection Details Section */}
        <div className="grid grid-cols-2 gap-y-4 mb-8">
          <div>
            <p className="text-sm text-gray-500">Provider</p>
            <p className="font-medium">Amazon S3</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Bucket</p>
            <p className="font-medium">asdfasdf</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Files to import</p>
            <p className="font-medium">1247 files</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Total size</p>
            <p className="font-medium">2.3 GB</p>
          </div>
        </div>

        {/* Import Process Section */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Import Process</h3>
          <p className="text-blue-700">
            Files will be imported in the background. You can continue working while the import is in progress.
          </p>
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderProviderSelectionStep();
      case 1:
      return renderProviderDetails();
      case 2:
        return renderPreviewStep();
      case 3:
        return renderReviewStep();
      default:
        return null;
    }
  };

  const handleClose = () => {
    onClose();
    modalInstance?.close();
  };
  
  return (
    <div style={{
      display: "flex", 
      flexDirection: "column",
      height: "100%",
      width: "100%",

    }}>

      {/* Custom header with title, subtitle and close button */}
      <div style={{
        padding: "1rem 1.5rem",
        paddingTop: "1.5rem",
        
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        <div>
          <h2 style={{ 
            margin: "0 0 0.5rem 0",
            fontSize: "1.75rem",
            fontWeight: "500",
            color: "var(--color-neutral-content)"
          }}>
            {title}
          </h2>
          {true && (
            <div style={{
              fontSize: "1rem",
              color: "var(--color-neutral-content-subtle)",
              lineHeight: "1.4"
            }}>
              {"Import your data from cloud storage providers"}
            </div>
          )}
        </div>
        <Button 
          icon={<IconCross />} 
          style={{ 
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: "0.5rem",
            marginRight: "-0.5rem",
            marginTop: "-0.25rem"
          }}
          onClick={handleClose}
        />
      </div>

      
      <Stepper steps={steps} currentStep={currentStep} />
      
      <div style={{
        maxHeight: "60vh", // Adjust height as needed
        overflowY: "auto", // This enables vertical scrolling
        padding: "1rem 1.5rem",
        
        
      }}>
        { renderStepContent() }
      </div>
      
      <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50"> 
        <Button 
          variant="outline" 
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          Previous
        </Button>

        <div className="flex" style={{ gap: '12px' }}>
          {currentStep === 1 && (
            <Button.Group className={rootClass.elem("buttons")}>
              <Button type="button" waiting={testingConnection} onClick={testStorageConnection}>
                Test Connection
              </Button>
            </Button.Group>
          )}

          {currentStep === 2 && (
            <Button.Group className={rootClass.elem("buttons")}>
              <Button size="sm" waiting={loadingFilesPreiview} onClick={loadFilesPreview}>
                Load Preview
              </Button>
            </Button.Group>
            
          )}
          
          <Button onClick={nextStep} disabled={(currentStep === 1 && ! connectionChecked) || (currentStep === 2 && filesPreview === null)} primary>
            {currentStep < steps.length - 1 ? "Next" : "Submit"}
          </Button>
        </div>

      </div>
    </div>
  );
  
  return (

    <ToastProvider>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add Cloud Storage Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <Stepper steps={steps} currentStep={currentStep} />
          { renderStepContent() }
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          <Button onClick={nextStep}>
            {currentStep < steps.length - 1 ? "Next" : "Submit"}
          </Button>
        </CardFooter>
      </Card>
      <ToastViewport />
    </ToastProvider>
  );

});
