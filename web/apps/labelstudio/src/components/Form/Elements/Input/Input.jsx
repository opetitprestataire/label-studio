import { cn } from "../../../../utils/bem";
import { FormField } from "../../FormField";
import { default as Label } from "../Label/Label";
import "./Input.scss";

const Input = ({
  label,
  description,
  footer,
  className,
  validate,
  required,
  skip,
  labelProps,
  ghost,
  error,
  tooltip,
  tooltipIcon,
  ...props
}) => {
  const input = (
    <FormField label={label} name={props.name} validate={validate} required={required} skip={skip} {...props}>
      {(ref, _dependencyField, _context, fieldProps) => {
        const hasError = error || fieldProps?.error;
        const finalClassList = [cn("input-ls").mod({ ghost, error: hasError }), className].join(" ").trim();
        return <input {...props} ref={ref} className={finalClassList} />;
      }}
    </FormField>
  );

  return label ? (
    <Label
      {...(labelProps ?? {})}
      description={description}
      footer={footer}
      text={label}
      tooltip={tooltip}
      tooltipIcon={tooltipIcon}
      required={required}
    >
      {input}
    </Label>
  ) : (
    input
  );
};

export default Input;
