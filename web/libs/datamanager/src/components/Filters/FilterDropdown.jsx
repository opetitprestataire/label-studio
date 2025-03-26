import { observer } from "mobx-react";
import { Select } from "@humansignal/ui";
import { useMemo } from "react";

export const FilterDropdown = observer(
  ({
    placeholder,
    defaultValue,
    items,
    style,
    disabled,
    onChange,
    multiple,
    value,
    optionRender,
    dropdownClassName,
    outputFormat,
  }) => {
    const parseItems = (item) => {
      return {
        ...(item?.options ? { children: item?.options.map(parseItems) } : {}),
        ...(item?.original ? { label: optionRender({ item }) } : {}),
        ...(item?.title ? { label: item?.title } : {}),
        ...item,
      };
    };
    const options = useMemo(() => items.map(parseItems), [items, optionRender]);

    return (
      <Select
        multiple={multiple}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={(value) => onChange(outputFormat?.(value) ?? value)}
        disabled={disabled}
        size="small"
        options={options}
        searchable={true}
        triggerProps={{ className: "whitespace-nowrap" }}
      />
    );
  },
);
