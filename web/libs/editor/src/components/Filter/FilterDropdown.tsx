import { useMemo, type FC } from "react";
import { Select } from "@humansignal/ui";

interface FilterDropdownInterface {
  items: any[];
  onChange: (value: any) => void;
  value?: string | string[] | undefined;
  placeholder?: string;
  defaultValue?: string | string[] | undefined;
  optionRender?: any;
  dataTestid?: string;
  style?: any;
}

export const FilterDropdown: FC<FilterDropdownInterface> = ({
  placeholder,
  defaultValue,
  items,
  style,
  dataTestid,
  value,
  onChange,
}) => {
  const options = useMemo(() => {
    return items.map((item) => {
      return {
        ...item,
        value: item.key ?? item.label,
      };
    });
  }, [items]);
  return (
    <Select
      placeholder={placeholder}
      defaultValue={defaultValue}
      dataTestid={dataTestid}
      value={value}
      style={{
        fontSize: 12,
        width: "100%",
        backgroundColor: "#fafafa",
        ...(style ?? {}),
      }}
      onChange={(value) => onChange(value)}
      options={options}
    />
  );
};
