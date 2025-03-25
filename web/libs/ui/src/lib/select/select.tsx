import { type ForwardedRef, forwardRef, useCallback, useEffect, useMemo, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@humansignal/shad/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@humansignal/shad/components/ui/popover";
import type { SelectOption, OptionProps, SelectProps } from "./types.ts";
import { Checkbox, Label } from "@humansignal/ui";
import { isDefined } from "@humansignal/core/lib/utils/helpers";
import { IconCheck, IconChevron, IconChevronDown } from "@humansignal/icons";
import clsx from "clsx";

export const Select = forwardRef(
  <T, A extends SelectOption<T>[]>(
    {
      label,
      description,
      options = [],
      validate,
      required,
      skip,
      labelProps,
      defaultValue,
      searchable,
      searchPlaceholder,
      value: externalValue,
      disabled = false,
      multiple = false,
      isInline = false,
      ...props
    }: SelectProps<T, A>,
    ref: ForwardedRef<HTMLSelectElement>,
  ) => {
    const [query, setQuery] = useState<string>("");
    let initialValue = defaultValue?.value ?? defaultValue ?? externalValue?.value ?? externalValue;

    if (multiple) {
      initialValue = Array.isArray(initialValue) ? initialValue ?? [] : [initialValue];
    } else if (Array.isArray(initialValue)) {
      initialValue = initialValue[0];
    }
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [value, setValue] = useState<any>(initialValue);

    useEffect(() => {
      if (!isDefined(externalValue)) return;
      let val = externalValue?.value ?? externalValue;
      if (multiple && !Array.isArray(val)) {
        val = [val];
      } else if (!multiple && Array.isArray(val)) {
        val = val[0];
      }
      setValue(val);
    }, [externalValue, multiple]);

    useEffect(() => {
      if (!isOpen) setQuery("");
    }, [isOpen]);
    const _onChange = useCallback(
      (val: string, isSelected: boolean) => {
        if (disabled) return;

        if (multiple) {
          setValue((prev = []) => {
            if (isSelected) {
              return [...prev.filter((v) => v !== val)];
            }
            return [...prev, val];
          });
        } else {
          setValue(val);
        }
        props?.onChange?.(val);
        setIsOpen(false);
      },
      [props?.onChange, multiple, disabled],
    );

    const flatOptions = useMemo(() => {
      return options.flatMap((option) => option?.children ?? option);
    }, [options]);

    const _options = useMemo(() => {
      if (!searchable || !query.trim()) return options;

      const filterHandler = (option: any) => {
        const label = option?.label ?? option?.value ?? option;

        return label?.toString()?.toLowerCase().includes(query.toLowerCase());
      };
      return flatOptions.filter(filterHandler);
    }, [options, searchable, query, flatOptions]);

    const isSelected = useCallback(
      (val: any) => {
        if (multiple) {
          return value.includes(val?.value ?? val);
        }
        return (value?.value ?? value) === (val?.value ?? val);
      },
      [value, multiple],
    );

    const selectedOptions = useMemo(() => {
      return flatOptions.filter((option) => isSelected(option));
    }, [flatOptions, isSelected, value, multiple]);

    const combobox = (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            variant="outline"
            aria-expanded={isOpen}
            className={clsx(
              isInline ? "" : "w-full",
              "inline-flex flex-1 justify-between p-3 items-center disabled:cursor-not-allowed disabled:opacity-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500",
              props.triggerProps?.className ?? "",
            )}
            type="button"
            data-testid={props?.['data-testid'] ?? "select-trigger"}
          >
            <span className="flex-1 text-left" data-testid="select-display-value">
              {value ? (
                <>{selectedOptions?.map((option) => option?.label ?? option?.value ?? option)}</>
              ) : (
                props?.placeholder ?? ""
              )}
            </span>
            {isOpen ? (
              <IconChevron className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            ) : (
              <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-99999" asChild={false} align="start" data-testid="select-popup">
          <Command>
            {searchable && (
              <CommandInput
                className="p-2 border-b border-gray-300"
                placeholder={searchPlaceholder ?? "Search"}
                onChangeCapture={(e) => setQuery(e.currentTarget.value)}
                data-testid="select-search-field"
              />
            )}
            <CommandList>
              <CommandEmpty>{searchable ? "No results found." : ""}</CommandEmpty>
              <CommandGroup>
                {_options.map((option, index) => {
                  const optionValue = option?.value ?? option;
                  const label = option?.label ?? optionValue;
                  const children = option?.children;
                  const isOptionSelected = isSelected(optionValue);

                  if (children) {
                    return (
                      <CommandGroup key={index}>
                        <div className="font-bold">{label}</div>
                        {children.map((item, i) => {
                          const val = item?.value ?? item;
                          const lab = item?.label ?? val;
                          const isChildOptionSelected = isSelected(val);
                          return (
                            <Option
                              key={`${val}_${i}`}
                              value={val}
                              label={lab}
                              isOptionSelected={isChildOptionSelected}
                              disabled={item?.disabled}
                              style={item?.style}
                              multiple={multiple}
                              onSelect={() => {
                                _onChange(val, isChildOptionSelected);
                              }}
                            />
                          );
                        })}
                      </CommandGroup>
                    );
                  }
                  return (
                    <Option
                      key={`${optionValue}_${index}`}
                      value={optionValue}
                      label={label}
                      isOptionSelected={isOptionSelected}
                      disabled={option?.disabled}
                      style={option?.style}
                      multiple={multiple}
                      onSelect={() => {
                        _onChange(optionValue, isOptionSelected);
                      }}
                    />
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        <input {...props} type="hidden" name={props?.name} value={value} ref={ref} disabled={disabled} />
      </Popover>
    );

    if (label) {
      return (
        <Label required={required} description={description} text={label} {...labelProps}>
          {combobox}
        </Label>
      );
    }
    return combobox;
  },
);

const Option = ({ value, label, isOptionSelected, disabled, style, multiple, onSelect }: OptionProps) => {
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      disabled={disabled}
      {...(disabled ? { "data-disabled": true } : {})}
      {...(style ? { style } : {})}
      data-testid="select-option"
    >
      {multiple ? (
        <Checkbox
          className={clsx("mr-2 h-4 w-4", isOptionSelected ? "opacity-100" : "opacity-0")}
          checked={isOptionSelected}
        />
      ) : isOptionSelected ? (
        <IconCheck className="mr-2 h-4 w-4" />
      ) : null}
      {label}
    </CommandItem>
  );
};

Select.displayName = "Select";
