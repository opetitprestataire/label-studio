import React, { useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { Block, Elem } from '@humansignal/ui';
import { PathSelector } from './components/PathSelector';
import { JSONKeySelector } from './components/JSONKeySelector';
import { ProjectConfig } from './components/ProjectConfig';
import { ProgressIndicator } from './components/ProgressIndicator';
import './CustomLanding.scss';

export const CustomLanding = () => {
  const history = useHistory();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // State for each step
  const [pathData, setPathData] = useState({
    imagePath: '',
    jsonPath: '',
    sampleJson: null,
    isValid: false
  });
  
  const [columnData, setColumnData] = useState({
    selectedKeys: [],
    columnMapping: {},
    previewData: []
  });
  
  const [projectData, setProjectData] = useState({
    name: '',
    description: ''
  });

  // Step configuration
  const steps = [
    {
      title: 'Select Folders',
      description: 'Choose image and JSON data folders',
      component: PathSelector,
      isComplete: () => pathData.isValid
    },
    {
      title: 'Configure Columns',
      description: 'Select JSON keys to use as columns',
      component: JSONKeySelector,
      isComplete: () => columnData.selectedKeys.length > 0
    },
    {
      title: 'Project Setup',
      description: 'Name your project and review settings',
      component: ProjectConfig,
      isComplete: () => projectData.name.trim().length > 0
    }
  ];

  // Navigation helpers
  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle project creation
  const handleProjectCreation = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/create-from-config/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
        },
        body: JSON.stringify({
          project_name: projectData.name,
          project_description: projectData.description,
          image_path: pathData.imagePath,
          json_path: pathData.jsonPath,
          selected_keys: columnData.selectedKeys,
          column_mapping: columnData.columnMapping
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const result = await response.json();
      
      // Redirect to the newly created project
      history.push(`/projects/${result.project_id}`);
      
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectData, pathData, columnData, history]);

  // Render current step component
  const renderCurrentStep = () => {
    const stepConfig = steps[currentStep];
    const StepComponent = stepConfig.component;
    
    const commonProps = {
      onNext: nextStep,
      onPrev: prevStep,
      canProceed: stepConfig.isComplete(),
      isLoading: loading
    };
    
    switch (currentStep) {
      case 0:
        return (
          <StepComponent
            {...commonProps}
            data={pathData}
            onUpdate={setPathData}
          />
        );
      case 1:
        return (
          <StepComponent
            {...commonProps}
            data={columnData}
            sampleJson={pathData.sampleJson}
            onUpdate={setColumnData}
          />
        );
      case 2:
        return (
          <StepComponent
            {...commonProps}
            data={projectData}
            pathData={pathData}
            columnData={columnData}
            onUpdate={setProjectData}
            onCreate={handleProjectCreation}
          />
        );
      default:
        return null;
    }
  };

  // Calculate overall progress
  const getProgress = () => {
    let completed = 0;
    steps.forEach((step, index) => {
      if (index < currentStep || step.isComplete()) {
        completed++;
      }
    });
    return Math.round((completed / steps.length) * 100);
  };

  return (
    <Block name="custom-landing">
      <Elem name="header">
        <Elem name="title">Create Your Annotation Project</Elem>
        <Elem name="subtitle">
          Set up your project in 3 simple steps with automatic data configuration
        </Elem>
      </Elem>

      <Elem name="content">
        <Elem name="progress-section">
          <ProgressIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={goToStep}
            progress={getProgress()}
          />
        </Elem>

        <Elem name="step-content">
          {renderCurrentStep()}
        </Elem>

        <Elem name="footer">
          <Elem name="progress-info">
            Progress: {getProgress()}% complete
          </Elem>
          
          <Elem name="actions">
            {currentStep > 0 && (
              <Elem 
                name="button" 
                mod={{ secondary: true }}
                onClick={prevStep}
                disabled={loading}
              >
                Previous
              </Elem>
            )}
            
            <Elem 
              name="button" 
              mod={{ link: true }}
              onClick={() => history.push('/projects')}
              disabled={loading}
            >
              Skip to Projects
            </Elem>
          </Elem>
        </Elem>
      </Elem>
    </Block>
  );
};

// Add display name for debugging
CustomLanding.displayName = 'CustomLanding';