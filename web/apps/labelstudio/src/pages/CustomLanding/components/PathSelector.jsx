import React, { useState, useCallback, useEffect } from 'react';
import { Block, Elem } from '@humansignal/ui';

export const PathSelector = ({ data, onUpdate, onNext, canProceed, isLoading }) => {
  const [validationState, setValidationState] = useState({
    imagePathStatus: 'default', // 'default', 'validating', 'success', 'error'
    jsonPathStatus: 'default',
    imagePathMessage: '',
    jsonPathMessage: '',
    imageFileCount: 0,
    jsonFileCount: 0
  });

  // Validate folder path
  const validatePath = useCallback(async (path, type) => {
    if (!path.trim()) return { valid: false, message: 'Path is required', fileCount: 0 };

    try {
      const response = await fetch('/api/folders/validate/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
        },
        body: JSON.stringify({ path, type })
      });

      const result = await response.json();
      return {
        valid: result.valid,
        message: result.message,
        fileCount: result.file_count || 0,
        sampleFiles: result.sample_files || []
      };
    } catch (error) {
      return { 
        valid: false, 
        message: 'Unable to validate path. Please check the path and try again.',
        fileCount: 0
      };
    }
  }, []);

  // Load sample JSON
  const loadSampleJson = useCallback(async (jsonPath) => {
    try {
      const response = await fetch('/api/folders/sample-json/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
        },
        body: JSON.stringify({ path: jsonPath })
      });

      const result = await response.json();
      return result.success ? result.sample_json : null;
    } catch (error) {
      console.error('Error loading sample JSON:', error);
      return null;
    }
  }, []);

  // Handle path change with debounced validation
  const handlePathChange = useCallback(async (path, type) => {
    const field = type === 'images' ? 'imagePath' : 'jsonPath';
    const statusField = type === 'images' ? 'imagePathStatus' : 'jsonPathStatus';
    const messageField = type === 'images' ? 'imagePathMessage' : 'jsonPathMessage';
    const countField = type === 'images' ? 'imageFileCount' : 'jsonFileCount';

    // Update input value immediately
    onUpdate(prev => ({
      ...prev,
      [field]: path
    }));

    if (!path.trim()) {
      setValidationState(prev => ({
        ...prev,
        [statusField]: 'default',
        [messageField]: '',
        [countField]: 0
      }));
      return;
    }

    // Set validating state
    setValidationState(prev => ({
      ...prev,
      [statusField]: 'validating',
      [messageField]: 'Validating path...'
    }));

    // Validate path
    const validation = await validatePath(path, type);
    
    setValidationState(prev => ({
      ...prev,
      [statusField]: validation.valid ? 'success' : 'error',
      [messageField]: validation.message,
      [countField]: validation.fileCount
    }));

    // If both paths are valid and this is the JSON path, load sample
    const currentImageValid = type === 'images' ? validation.valid : 
      validationState.imagePathStatus === 'success';
    const currentJsonValid = type === 'json' ? validation.valid : 
      validationState.jsonPathStatus === 'success';

    if (type === 'json' && validation.valid) {
      const sampleJson = await loadSampleJson(path);
      onUpdate(prev => ({
        ...prev,
        sampleJson,
        isValid: currentImageValid && currentJsonValid
      }));
    } else {
      onUpdate(prev => ({
        ...prev,
        isValid: currentImageValid && currentJsonValid
      }));
    }
  }, [validatePath, loadSampleJson, onUpdate, validationState.imagePathStatus, validationState.jsonPathStatus]);

  // Debounced input handler
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (data.imagePath && validationState.imagePathStatus === 'default') {
        handlePathChange(data.imagePath, 'images');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [data.imagePath, validationState.imagePathStatus, handlePathChange]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (data.jsonPath && validationState.jsonPathStatus === 'default') {
        handlePathChange(data.jsonPath, 'json');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [data.jsonPath, validationState.jsonPathStatus, handlePathChange]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'validating': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '';
    }
  };

  const getStatusClass = (status) => {
    return status === 'default' ? '' : status;
  };

  return (
    <Block name="path-selector">
      <Elem name="header">
        <Elem name="title">Select Your Data Folders</Elem>
        <Elem name="description">
          Choose the folders containing your images and JSON annotation data
        </Elem>
      </Elem>

      <Elem name="form">
        {/* Image Path Input */}
        <Elem name="field">
          <Elem name="label">
            <Elem name="label-text">Images Folder Path</Elem>
            <Elem name="label-required">*</Elem>
          </Elem>
          <Elem name="input-wrapper">
            <Elem 
              name="input"
              tag="input"
              type="text"
              placeholder="/path/to/your/images"
              value={data.imagePath}
              onChange={(e) => handlePathChange(e.target.value, 'images')}
              mod={{ [getStatusClass(validationState.imagePathStatus)]: true }}
              disabled={isLoading}
            />
            <Elem name="status-icon">
              {getStatusIcon(validationState.imagePathStatus)}
            </Elem>
          </Elem>
          <Elem 
            name="message" 
            mod={{ [getStatusClass(validationState.imagePathStatus)]: true }}
          >
            {validationState.imagePathMessage}
            {validationState.imageFileCount > 0 && (
              <span> ({validationState.imageFileCount} images found)</span>
            )}
          </Elem>
        </Elem>

        {/* JSON Path Input */}
        <Elem name="field">
          <Elem name="label">
            <Elem name="label-text">JSON Data Folder Path</Elem>
            <Elem name="label-required">*</Elem>
          </Elem>
          <Elem name="input-wrapper">
            <Elem 
              name="input"
              tag="input"
              type="text"
              placeholder="/path/to/your/json-files"
              value={data.jsonPath}
              onChange={(e) => handlePathChange(e.target.value, 'json')}
              mod={{ [getStatusClass(validationState.jsonPathStatus)]: true }}
              disabled={isLoading}
            />
            <Elem name="status-icon">
              {getStatusIcon(validationState.jsonPathStatus)}
            </Elem>
          </Elem>
          <Elem 
            name="message" 
            mod={{ [getStatusClass(validationState.jsonPathStatus)]: true }}
          >
            {validationState.jsonPathMessage}
            {validationState.jsonFileCount > 0 && (
              <span> ({validationState.jsonFileCount} JSON files found)</span>
            )}
          </Elem>
        </Elem>

        {/* Sample JSON Preview */}
        {data.sampleJson && (
          <Elem name="preview">
            <Elem name="preview-title">Sample JSON Structure</Elem>
            <Elem name="preview-content">
              <pre>{JSON.stringify(data.sampleJson, null, 2)}</pre>
            </Elem>
          </Elem>
        )}
      </Elem>

      <Elem name="actions">
        <Elem 
          name="button" 
          mod={{ primary: true }}
          onClick={onNext}
          disabled={!canProceed || isLoading}
        >
          Next: Configure Columns
        </Elem>
      </Elem>
    </Block>
  );
};

PathSelector.displayName = 'PathSelector';