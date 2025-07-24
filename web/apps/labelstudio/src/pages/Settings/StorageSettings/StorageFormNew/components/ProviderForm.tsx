import React from "react";
import { FieldRenderer } from "./FieldRenderer";
import { ProviderConfig, getFieldsForRow } from "../types/provider";

interface ProviderFormProps {
  provider: ProviderConfig;
  formData: Record<string, any>;
  errors: Record<string, string>;
  onChange: (name: string, value: any) => void;
}

export const ProviderForm: React.FC<ProviderFormProps> = ({ provider, formData, errors, onChange }) => {
  return (
    <div className="space-y-6">
      {provider.layout.map((row, rowIndex) => (
        <div key={rowIndex} className={`grid grid-cols-${row.fields.length} gap-6`}>
          {getFieldsForRow(provider.fields, row.fields).map((field) => (
            <div key={field.name} className={`col-span-${field.gridCols || 1}`}>
              <FieldRenderer
                field={field}
                value={formData[field.name]}
                onChange={onChange}
                error={errors[field.name]}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}; 