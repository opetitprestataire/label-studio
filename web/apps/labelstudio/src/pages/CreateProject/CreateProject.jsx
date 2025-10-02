import { Button, EnterpriseBadge, Select, Typography } from "@humansignal/ui";
import React, { useRef } from "react";
import { useHistory } from "react-router";
import { ToggleItems } from "../../components";
import { HeidiTips } from "../../components/HeidiTips/HeidiTips";
import { Modal } from "../../components/Modal/Modal";
import { Space } from "../../components/Space/Space";
import { useAPI } from "../../providers/ApiProvider";
import { cn } from "../../utils/bem";
import { ConfigPage } from "./Config/Config";
import "./CreateProject.scss";
import { Form, Input, TextArea } from "../../components/Form";
import { createURL } from "../../components/HeidiTips/utils";
import { FF_LSDV_E_297, isFF } from "../../utils/feature-flags";
import { ImportPage } from "./Import/Import";
import { useImportPage } from "./Import/useImportPage";
import { useDraftProject } from "./utils/useDraftProject";

const ProjectName = ({
  name,
  setName,
  onSaveName,
  onSubmit,
  error,
  description,
  setDescription,
  show = true,
  formRef,
  onValidationChange,
  onClearError,
}) =>
  !show ? null : (
    <Form
      ref={formRef}
      className={cn("project-name")}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="w-full flex flex-col gap-2">
        <Input
          name="name"
          id="project_name"
          label="Project Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            // Clear validation error when user starts typing
            onValidationChange?.(false);
            // Clear server error when user starts typing
            if (error) onClearError?.();
          }}
          onBlur={() => {
            onSaveName();
            // Trigger form validation to show errors immediately
            const isValid = formRef.current?.validateFields();
            onValidationChange?.(!isValid);
          }}
          className="project-title w-full"
          required
          validate={[Form.Validator.minLength(3), Form.Validator.maxLength(50)]}
        />
      </div>
      <div className="w-full flex flex-col gap-2">
        <label className="w-full" htmlFor="project_description">
          Description
        </label>
        <TextArea
          name="description"
          id="project_description"
          placeholder="Optional description of your project"
          rows="4"
          style={{ minHeight: 100 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="project-description w-full"
        />
      </div>
      {isFF(FF_LSDV_E_297) && (
        <div className="w-full flex flex-col gap-2">
          <label htmlFor="workspace_select">
            Workspace
            <EnterpriseBadge className="ml-2" />
          </label>
          <Select
            id="workspace_select"
            placeholder="Select an option"
            disabled
            options={[]}
            triggerClassName="!flex-1"
          />
          <Typography size="small" className="mt-tight mb-wider">
            Simplify project management by organizing projects into workspaces.{" "}
            <a
              href={createURL(
                "https://docs.humansignal.com/guide/manage_projects#Create-workspaces-to-organize-projects",
                {
                  experiment: "project_creation_dropdown",
                  treatment: "simplify_project_management",
                },
              )}
              target="_blank"
              rel="noreferrer"
              className="underline hover:no-underline"
            >
              Learn more
            </a>
          </Typography>
          <HeidiTips collection="projectCreation" />
        </div>
      )}
    </Form>
  );

export const CreateProject = ({ onClose }) => {
  const [step, _setStep] = React.useState("name"); // name | import | config
  const [waiting, setWaitingStatus] = React.useState(false);
  const formRef = useRef();

  const { project, setProject: updateProject } = useDraftProject();
  const history = useHistory();
  const api = useAPI();

  const [name, setName] = React.useState("");
  const [error, setError] = React.useState();
  const [description, setDescription] = React.useState("");
  const [sample, setSample] = React.useState(null);
  const [hasNameValidationError, setHasNameValidationError] = React.useState(false);

  const validateNameStepBeforeNavigation = React.useCallback(() => {
    if (formRef.current && !formRef.current.validateFields()) {
      setHasNameValidationError(true);
      return false;
    }
    setHasNameValidationError(false);
    return true;
  }, []);

  const setStep = React.useCallback(
    (newStep) => {
      // If trying to navigate away from name step, validate the form first
      if (step === "name" && newStep !== "name") {
        if (!validateNameStepBeforeNavigation()) {
          return;
        }
      }

      _setStep(newStep);
      const eventNameMap = {
        name: "project_name",
        import: "data_import",
        config: "labeling_setup",
      };
      __lsa(`create_project.tab.${eventNameMap[newStep]}`);
    },
    [step, validateNameStepBeforeNavigation],
  );

  React.useEffect(() => {
    setError(null);
  }, []);

  const { columns, uploading, uploadDisabled, finishUpload, pageProps, uploadSample } = useImportPage(project, sample);

  const rootClass = cn("create-project");
  const tabClass = rootClass.elem("tab");

  // Check if name step has validation issues (server errors or form validation errors)
  const nameStepHasErrors = !!error || hasNameValidationError;

  const steps = {
    name: (
      <span
        className={tabClass.mod({
          "has-error": nameStepHasErrors,
        })}
      >
        Project Name
      </span>
    ),
    import: (
      <span
        className={tabClass.mod({
          disabled: uploadDisabled || nameStepHasErrors,
        })}
      >
        Data Import
      </span>
    ),
    config: <span className={tabClass.mod({ disabled: nameStepHasErrors })}>Labeling Setup</span>,
  };

  // Set initial name from project, but only once when project loads
  const hasInitializedNameRef = useRef(false);
  React.useEffect(() => {
    if (project && project.title && !hasInitializedNameRef.current) {
      setName(project.title);
      hasInitializedNameRef.current = true;
    }
  }, [project]);

  const projectBody = React.useMemo(
    () => ({
      title: name,
      description,
      label_config: project?.label_config ?? "<View></View>",
    }),
    [name, description, project?.label_config],
  );

  const onCreate = React.useCallback(async () => {
    // Always validate the Project Name form first, regardless of current step
    if (formRef.current && !formRef.current.validateFields()) {
      // If validation fails, switch to the name step to show errors
      setStep("name");
      return;
    }

    setWaitingStatus(true);

    // Save the complete project data including label_config
    const updateResult = await api.callApi("updateProjectRaw", {
      params: {
        pk: project.id,
      },
      body: projectBody,
    });

    if (!updateResult.ok) {
      const err = await updateResult.json();
      setError(err.validation_errors?.title || "Failed to save project configuration");
      setWaitingStatus(false);
      return;
    }

    const imported = await finishUpload();

    if (!imported) {
      setWaitingStatus(false);
      return;
    }

    if (sample) await uploadSample(sample);

    __lsa("create_project.create", { sample: sample?.url });

    setWaitingStatus(false);

    if (imported !== null && project) {
      history.push(`/projects/${project.id}/data`);
    }
  }, [
    project,
    projectBody,
    finishUpload,
    sample,
    uploadSample,
    api.callApi,
    setError,
    // Including these stable references to satisfy linter, though they don't change
    history.push,
    setStep,
  ]);

  const onSaveName = async () => {
    // Return early if there are existing validation errors or waiting for another operation
    if (error || waiting) return;

    const res = await api.callApi("updateProjectRaw", {
      params: {
        pk: project.id,
      },
      body: {
        title: name,
      },
    });

    if (res.ok) {
      // Clear any existing errors on successful save
      setError(null);
      return;
    }

    const err = await res.json();
    setError(err.validation_errors?.title);
  };

  const onDelete = React.useCallback(() => {
    const performClose = async () => {
      setWaitingStatus(true);
      if (project)
        await api.callApi("deleteProject", {
          params: {
            pk: project.id,
          },
        });
      setWaitingStatus(false);
      updateProject(null);
      onClose?.();
    };
    performClose();
  }, [
    project,
    // Including these stable references to satisfy linter, though they don't change
    api.callApi,
    updateProject,
    onClose,
  ]);

  return (
    <Modal onHide={onDelete} closeOnClickOutside={false} allowToInterceptEscape fullscreen visible bare>
      <div className={rootClass}>
        <Modal.Header>
          <h1>Create Project</h1>
          <ToggleItems items={steps} active={step} onSelect={setStep} />

          <Space>
            <Button
              variant="negative"
              look="outlined"
              size="small"
              onClick={onDelete}
              waiting={waiting}
              aria-label="Cancel project creation"
            >
              Cancel
            </Button>
            <Button
              look="primary"
              size="small"
              onClick={onCreate}
              waiting={waiting || uploading}
              disabled={!project || uploadDisabled || error}
            >
              Save
            </Button>
          </Space>
        </Modal.Header>
        <ProjectName
          name={name}
          setName={setName}
          error={error}
          onSaveName={onSaveName}
          onSubmit={onCreate}
          description={description}
          setDescription={setDescription}
          show={step === "name"}
          formRef={formRef}
          onValidationChange={setHasNameValidationError}
          onClearError={() => setError(null)}
        />
        <ImportPage
          project={project}
          show={step === "import"}
          sample={sample}
          onSampleDatasetSelect={setSample}
          openLabelingConfig={() => setStep("config")}
          {...pageProps}
        />
        <ConfigPage
          project={project}
          onUpdate={(config) => {
            updateProject({ ...project, label_config: config });
          }}
          show={step === "config"}
          columns={columns}
          disableSaveButton={true}
        />
      </div>
    </Modal>
  );
};
