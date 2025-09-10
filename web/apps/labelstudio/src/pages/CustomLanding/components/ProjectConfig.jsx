import React, { useCallback } from 'react';
import { Block, Elem } from '@humansignal/ui';

export const ProjectConfig = ({ 
  data, 
  pathData, 
  columnData, 
  onUpdate, 
  onPrev, 
  onCreate, 
  canProceed, 
  isLoading 
}) => {
  
  const handleNameChange = useCallback((e) => {
    onUpdate(prev => ({
      ...prev,
      name: e.target.value
    }));
  }, [onUpdate]);

  const handleDescriptionChange = useCallback((e) => {
    onUpdate(prev => ({
      ...prev,
      description: e.target.value
    }));
  }, [onUpdate]);

  const validateProjectName = (name) => {
    if (!name.trim()) return false;
    if (name.length < 3) return false;
    if (name.length > 100) return false;
    return true;
  };

  const isNameValid = validateProjectName(data.name);

  return (
    <Block name="project-config">
      <Elem name="header">
        <Elem name="title">Project Configuration</Elem>
        <Elem name="description">
          Name your project and review the configuration before creation
        </Elem>
      </Elem>

      <Elem name="content">
        {/* Project Details Form */}
        <Elem name="form-section">
          <Elem name="section-title">Project Details</Elem>
          
          <Elem name="field">
            <Elem name="label">
              <Elem name="label-text">Project Name</Elem>
              <Elem name="label-required">*</Elem>
            </Elem>
            <Elem 
              name="input"
              tag="input"
              type="text"
              placeholder="Enter a descriptive project name"
              value={data.name}
              onChange={handleNameChange}
              mod={{ invalid: data.name && !isNameValid }}
              disabled={isLoading}
            />
            <Elem name="field-help">
              Must be 3-100 characters long
            </Elem>
          </Elem>

          <Elem name="field">
            <Elem name="label">
              <Elem name="label-text">Project Description</Elem>
              <Elem name="label-optional">(optional)</Elem>
            </Elem>
            <Elem 
              name="textarea"
              tag="textarea"
              placeholder="Describe what this project is for..."
              value={data.description}
              onChange={handleDescriptionChange}
              disabled={isLoading}
              rows="3"
            />
          </Elem>
        </Elem>

        {/* Configuration Summary */}
        <Elem name="summary-section">
          <Elem name="section-title">Configuration Summary</Elem>
          
          <Elem name="summary-grid">
            <Elem name="summary-item">
              <Elem name="summary-label">Images Folder</Elem>
              <Elem name="summary-value">{pathData.imagePath}</Elem>
            </Elem>
            
            <Elem name="summary-item">
              <Elem name="summary-label">JSON Data Folder</Elem>
              <Elem name="summary-value">{pathData.jsonPath}</Elem>
            </Elem>
            
            <Elem name="summary-item">
              <Elem name="summary-label">Selected Columns</Elem>
              <Elem name="summary-value">
                {columnData.selectedKeys.length > 0 ? (
                  <Elem name="column-list">
                    {columnData.selectedKeys.map(key => (
                      <Elem key={key} name="column-tag">
                        {key}
                        <Elem name="column-type">
                          ({columnData.columnMapping[key]?.type})
                        </Elem>
                      </Elem>
                    ))}
                  </Elem>
                ) : (
                  'No columns selected'
                )}
              </Elem>
            </Elem>
          </Elem>
        </Elem>

        {/* Warning/Info Messages */}
        {columnData.selectedKeys.length === 0 && (
          <Elem name="warning">
            <Elem name="warning-icon">⚠️</Elem>
            <Elem name="warning-text">
              No columns selected. Please go back and select at least one JSON key to use as a column.
            </Elem>
          </Elem>
        )}

        {!isNameValid && data.name && (
          <Elem name="warning">
            <Elem name="warning-icon">⚠️</Elem>
            <Elem name="warning-text">
              Project name must be between 3 and 100 characters long.
            </Elem>
          </Elem>
        )}
      </Elem>

      <Elem name="actions">
        <Elem 
          name="button" 
          mod={{ secondary: true }}
          onClick={onPrev}
          disabled={isLoading}
        >
          Previous
        </Elem>
        <Elem 
          name="button" 
          mod={{ primary: true, loading: isLoading }}
          onClick={onCreate}
          disabled={!canProceed || isLoading}
        >
          {isLoading ? 'Creating Project...' : 'Create Project'}
        </Elem>
      </Elem>
    </Block>
  );
};

ProjectConfig.displayName = 'ProjectConfig';