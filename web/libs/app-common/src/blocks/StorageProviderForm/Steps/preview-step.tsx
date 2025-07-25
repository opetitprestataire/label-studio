import { Label, Toggle, Select } from "@humansignal/ui";
import { Form, Input } from "apps/labelstudio/src/components/Form";
import { IconDocument, IconSearch } from "@humansignal/icons";
import { formatDistanceToNow } from "date-fns";
import { type ForwardedRef } from "react";

interface PreviewStepProps {
  formData: any;
  formState: any;
  setFormState: (updater: (prevState: any) => any) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  action: string;
  target: string;
  type: string;
  project: string;
  storage?: any;
  onSubmit: () => void;
  formRef: ForwardedRef<unknown>;
  filesPreview: any[] | null;
  formatSize: (bytes: number) => string;
}

export const PreviewStep = ({
  formData,
  formState,
  setFormState,
  handleChange,
  action,
  target,
  type,
  project,
  storage,
  onSubmit,
  formRef,
  filesPreview,
  formatSize,
}: PreviewStepProps) => {
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
            formData={{ ...(storage ?? {}) }}
            skipEmpty={false}
            onSubmit={onSubmit}
            autoFill="off"
            autoComplete="off"
          >
            <div className="space-y-8">
              {/* File Filter Section */}
              <div className="space-y-2">
                <Label htmlFor="regex_filter">File Name Filter (Optional)</Label>
                <p className="text-sm text-muted-foreground">Use regex patterns to filter which files are imported</p>
                <Input
                  id="regex_filter"
                  name="regex_filter"
                  value={formData.regex_filter ?? ""}
                  onChange={handleChange}
                  placeholder=".*\.(jpg|png)$ - imports only JPG, PNG files"
                  style={{ width: "100%" }}
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

                <div className="flex flex-wrap gap-x-2 items-center text-xs">
                  <span className="text-muted-foreground">Common filters:</span>
                  <a
                    href="#"
                    className="text-blue-600 border-b border-dotted border-blue-400 hover:text-blue-800"
                    onClick={(e) => {
                      e.preventDefault();
                      setFormState((prevState) => ({
                        ...prevState,
                        formData: {
                          ...prevState.formData,
                          regex_filter: ".*.(jpe?g|png|gif)$",
                        },
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
                      setFormState((prevState) => ({
                        ...prevState,
                        formData: {
                          ...prevState.formData,
                          regex_filter: ".*\\.(mp4|avi|mov|wmv|webm)$",
                        },
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
                      setFormState((prevState) => ({
                        ...prevState,
                        formData: {
                          ...prevState.formData,
                          regex_filter: ".*\\.(mp3|wav|ogg|flac)$",
                        },
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
                      setFormState((prevState) => ({
                        ...prevState,
                        formData: {
                          ...prevState.formData,
                          regex_filter: ".*\\.(csv|tsv)$",
                        },
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
                      setFormState((prevState) => ({
                        ...prevState,
                        formData: {
                          ...prevState.formData,
                          regex_filter: ".*",
                        },
                      }));
                    }}
                  >
                    All Files
                  </a>
                </div>
              </div>

              {/* Import Method */}
              <div className="space-y-2">
                <Label htmlFor="use_blob_urls">Import Method</Label>
                <p className="text-sm text-muted-foreground">Choose how to import your data from storage</p>
                <Select
                  name="use_blob_urls"
                  value={formData.use_blob_urls ? "Files" : "JSON"}
                  onChange={(value) => {
                    const isFiles = value === "Files";
                    setFormState((prevState) => ({
                      ...prevState,
                      formData: {
                        ...prevState.formData,
                        use_blob_urls: isFiles,
                      },
                    }));
                  }}
                  options={[
                    {
                      value: "Files",
                      label: "Files - Automatically creates a task for each storage object (e.g. JPG, MP3, TXT)",
                    },
                    {
                      value: "JSON",
                      label: "JSON - Treat each JSON or JSONL file as a task definition (one or more tasks per file)",
                    },
                  ] as any}
                  placeholder="Select import method"
                />
              </div>

              {/* Scan All Subfolders */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="block mb-2">Scan all sub-folders</Label>
                  <p className="text-sm text-muted-foreground">Include files from all nested folders</p>
                </div>
                <Toggle
                  checked={formData.recursive_scan ?? true}
                  onChange={(e) =>
                    setFormState((prevState) => ({
                      ...prevState,
                      formData: {
                        ...prevState.formData,
                        recursive_scan: e.target.checked,
                      },
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
                  Configure your import settings and click "Load Preview" to see a sample of files that will be
                  imported.
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
                  No files matching your current criteria were found. Try adjusting your filter settings and reload
                  the preview.
                </p>
              </div>
            ) : (
              // Files available - display in a table format with fixed height and scrolling
              <div className="px-2 py-2 flex-grow overflow-auto">
                <div className="grid grid-cols-1 text-xs gap-1">
                  {filesPreview.map((file, index) => (
                    <div
                      key={index}
                      className="flex justify-between py-0.5 px-2 bg-gray-50 hover:bg-gray-100 border-b last:border-b-0 rounded-md"
                    >
                      <div className="truncate max-w-[260px]">
                        {file.key ? (
                          file.key
                        ) : (
                          <span className="italic">... preview limit reached ...</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground whitespace-nowrap">
                        <span>{file.last_modified && formatDistanceToNow(new Date(file.last_modified), { addSuffix: true })}</span>
                        <span className="mx-0.5">•</span>
                        <span>{file.size && formatSize(file.size)}</span>
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