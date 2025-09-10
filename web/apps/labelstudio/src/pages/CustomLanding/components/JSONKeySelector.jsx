import React, { useState, useEffect, useCallback } from 'react';
import { Block, Elem } from '@humansignal/ui';

export const JSONKeySelector = ({ 
  data, 
  sampleJson, 
  onUpdate, 
  onNext, 
  onPrev, 
  canProceed, 
  isLoading 
}) => {
  const [availableKeys, setAvailableKeys] = useState([]);
  const [keyDetails, setKeyDetails] = useState({});
  
  // Analyze JSON structure to get available keys
  useEffect(() => {
    if (sampleJson) {
      const keys = Object.keys(sampleJson);
      const details = {};
      
      keys.forEach(key => {
        const value = sampleJson[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        const sampleValue = Array.isArray(value) ? 
          `[${value.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}]` :
          String(value).slice(0, 50) + (String(value).length > 50 ? '...' : '');
        
        details[key] = {
          type,
          sampleValue,
          isSelected: data.selectedKeys.includes(key)
        };
      });
      
      setAvailableKeys(keys);
      setKeyDetails(details);
    }
  }, [sampleJson, data.selectedKeys]);

  // Handle key selection
  const handleKeyToggle = useCallback((key) => {
    const newSelectedKeys = data.selectedKeys.includes(key)
      ? data.selectedKeys.filter(k => k !== key)
      : [...data.selectedKeys, key];
    
    // Update column mapping
    const newColumnMapping = {};
    newSelectedKeys.forEach(selectedKey => {
      newColumnMapping[selectedKey] = {
        name: selectedKey,
        type: keyDetails[selectedKey]?.type || 'string',
        sampleValue: keyDetails[selectedKey]?.sampleValue || ''
      };
    });
    
    onUpdate({
      selectedKeys: newSelectedKeys,
      columnMapping: newColumnMapping,
      previewData: [sampleJson] // Use sample as preview
    });
  }, [data.selectedKeys, keyDetails, sampleJson, onUpdate]);

  // Handle select all/none
  const handleSelectAll = useCallback(() => {
    const allSelected = data.selectedKeys.length === availableKeys.length;
    const newSelectedKeys = allSelected ? [] : [...availableKeys];
    
    const newColumnMapping = {};
    newSelectedKeys.forEach(key => {
      newColumnMapping[key] = {
        name: key,
        type: keyDetails[key]?.type || 'string',
        sampleValue: keyDetails[key]?.sampleValue || ''
      };
    });
    
    onUpdate({
      selectedKeys: newSelectedKeys,
      columnMapping: newColumnMapping,
      previewData: [sampleJson]
    });
  }, [availableKeys, data.selectedKeys.length, keyDetails, sampleJson, onUpdate]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'string': return '📝';
      case 'number': return '🔢';
      case 'boolean': return '✓';
      case 'array': return '📋';
      case 'object': return '📦';
      default: return '❓';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'string': return 'blue';
      case 'number': return 'green';
      case 'boolean': return 'purple';
      case 'array': return 'orange';
      case 'object': return 'red';
      default: return 'gray';
    }
  };

  if (!sampleJson) {
    return (
      <Block name="json-key-selector">
        <Elem name="error">
          <Elem name="title">No JSON Data Available</Elem>
          <Elem name="message">
            Please go back and ensure your JSON folder path is valid and contains JSON files.
          </Elem>
          <Elem name="actions">
            <Elem 
              name="button" 
              mod={{ secondary: true }}
              onClick={onPrev}
            >
              Back to Folder Selection
            </Elem>
          </Elem>
        </Elem>
      </Block>
    );
  }

  return (
    <Block name="json-key-selector">
      <Elem name="header">
        <Elem name="title">Configure Project Columns</Elem>
        <Elem name="description">
          Select the JSON keys you want to use as columns in your annotation project
        </Elem>
      </Elem>

      <Elem name="content">
        <Elem name="controls">
          <Elem name="selection-info">
            {data.selectedKeys.length} of {availableKeys.length} keys selected
          </Elem>
          <Elem 
            name="button" 
            mod={{ link: true }}
            onClick={handleSelectAll}
          >
            {data.selectedKeys.length === availableKeys.length ? 'Deselect All' : 'Select All'}
          </Elem>
        </Elem>

        <Elem name="keys-list">
          {availableKeys.map(key => {
            const detail = keyDetails[key];
            const isSelected = data.selectedKeys.includes(key);
            
            return (
              <Elem 
                key={key}
                name="key-item"
                mod={{ selected: isSelected }}
                onClick={() => handleKeyToggle(key)}
              >
                <Elem name="key-checkbox">
                  <Elem 
                    name="checkbox"
                    tag="input"
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleKeyToggle(key)}
                  />
                </Elem>
                
                <Elem name="key-info">
                  <Elem name="key-header">
                    <Elem name="key-name">{key}</Elem>
                    <Elem 
                      name="key-type"
                      mod={{ [getTypeColor(detail.type)]: true }}
                    >
                      {getTypeIcon(detail.type)} {detail.type}
                    </Elem>
                  </Elem>
                  <Elem name="key-sample">
                    <strong>Sample:</strong> {detail.sampleValue}
                  </Elem>
                </Elem>
              </Elem>
            );
          })}
        </Elem>

        {data.selectedKeys.length > 0 && (
          <Elem name="preview">
            <Elem name="preview-title">Column Preview</Elem>
            <Elem name="preview-table">
              <Elem name="table-header">
                {data.selectedKeys.map(key => (
                  <Elem key={key} name="table-cell" mod={{ header: true }}>
                    {key}
                  </Elem>
                ))}
              </Elem>
              <Elem name="table-row">
                {data.selectedKeys.map(key => (
                  <Elem key={key} name="table-cell">
                    {String(sampleJson[key])}
                  </Elem>
                ))}
              </Elem>
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
          mod={{ primary: true }}
          onClick={onNext}
          disabled={!canProceed || isLoading}
        >
          Next: Project Setup
        </Elem>
      </Elem>
    </Block>
  );
};

JSONKeySelector.displayName = 'JSONKeySelector';