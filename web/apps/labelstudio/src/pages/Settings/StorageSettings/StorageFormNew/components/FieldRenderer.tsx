import React from "react";
import { Label, Toggle, Select } from "@humansignal/ui";
import Counter from "apps/labelstudio/src/components/Form/Elements/Counter/Counter";
import Input from "apps/labelstudio/src/components/Form/Elements/Input/Input";
import { FieldDefinition } from "../types/provider";

interface FieldRendererProps {
  field: FieldDefinition;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({ field, value, onChange, error }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value: inputValue, type } = e.target;
    const parsedValue = type === "number" ? Number(inputValue) : inputValue;
    onChange(name, parsedValue);
  };

  const handleToggleChange = (checked: boolean) => {
    onChange(field.name, checked);
  };

  const handleSelectChange = (value: string) => {
    onChange(field.name, value);
  };

  const handleCounterChange = (e: any) => {
    onChange(field.name, Number(e.target.value));
  };

  // Common props for Input component
  const getInputProps = () => ({
    validate: "",
    skip: false,
    labelProps: {},
    ghost: false,
    tooltip: "",
    tooltipIcon: null,
    required: field.required,
    label: field.label,
    description: field.description || "",
    footer: error || "",
    className: error ? "border-red-500" : "",
    placeholder: field.placeholder,
    autoComplete: field.autoComplete,
  });

  switch (field.type) {
    case "text":
    case "password":
      return (
        <Input
          name={field.name}
          type={field.type}
          value={value || ""}
          onChange={handleInputChange}
          {...getInputProps()}
        />
      );

    case "number":
      return (
        <Input
          name={field.name}
          type="number"
          value={value || ""}
          onChange={handleInputChange}
          min={field.min}
          max={field.max}
          step={field.step}
          {...getInputProps()}
        />
      );

    case "textarea":
      return (
        <Input
          name={field.name}
          value={value || ""}
          onChange={handleInputChange}
          {...getInputProps()}
        />
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label text={field.label} description={field.description} />
          <Select
            name={field.name}
            value={value ?? ""}
            onChange={(selectedValue) => handleSelectChange(selectedValue)}
            options={field.options || []}
            placeholder={field.placeholder}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      );

    case "toggle":
      return (
        <div className="flex items-start space-x-4">
          <Toggle
            checked={value || false}
            onChange={(e) => handleToggleChange(e.target.checked)}
            aria-label={field.label}
          />
          <div>
            <Label className="text-sm font-medium">{field.label}</Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
      );

    case "counter":
      return (
        <Counter
          name={field.name}
          label={field.label}
          value={value || field.min || 0}
          min={field.min || 0}
          max={field.max || 100}
          step={field.step || 1}
          onChange={handleCounterChange}
          className=""
          validate=""
          required={field.required || false}
          skip={false}
          labelProps={{}}
        />
      );

    default:
      return (
        <div className="text-red-500">
          Unknown field type: {field.type}
        </div>
      );
  }
}; 