import { type ForwardedRef, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { IconChevron, IconChevronDown } from "@humansignal/icons";
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
      isInProgress = false,
      triggerProps,
      ...props
    }: SelectProps<T, A>,
    ref: ForwardedRef<HTMLSelectElement>,
  ) => {
    const triggerRef = ref ?? useRef<HTMLDivElement>();
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
        !multiple && setIsOpen(false);
      },
      [props?.onChange, multiple, disabled],
    );

    const flatOptions = useMemo(() => {
      return options.flatMap((option) => option?.children ?? option);
    }, [options]);

    const _options = useMemo(() => {
      if (!searchable || !query.trim()) return options;

      const filterHandler = (option: any) => {
        const value = option?.value ?? option;
        const label = option?.label ?? option?.value ?? option;
        return (
          label?.toString()?.toLowerCase().includes(query.toLowerCase()) ||
          value?.toString()?.toLowerCase().includes(query.toLowerCase())
        );
      };
      return flatOptions.filter(filterHandler);
    }, [options, flatOptions, searchable, query]);

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
        <PopoverTrigger asChild={true} disabled={disabled}>
          <button
            variant="outline"
            aria-expanded={isOpen}
            className={clsx(
              isInline ? "" : "w-full",
              "inline-flex flex-1 justify-between p-3 items-center disabled:cursor-not-allowed disabled:opacity-50 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500",
              triggerProps?.className ?? "",
            )}
            type="button"
            data-testid={props?.["data-testid"] ?? "select-trigger"}
            ref={triggerRef}
          >
            <span className="flex-1 text-left" data-testid="select-display-value">
              {isDefined(value) ? (
                <>
                  {selectedOptions?.map((option, index) => {
                    const optionValue = option?.value ?? option;
                    return (
                      <span key={`${optionValue}_${index}`} className="truncate">
                        {option?.label ?? optionValue}
                      </span>
                    );
                  })}
                </>
              ) : (
                props?.placeholder ?? ""
              )}
            </span>
            {isOpen ? (
              <IconChevron className="ml-2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            ) : (
              <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-99999 min-w-full" align="start" data-testid="select-popup">
          <Command shouldFilter={false}>
            {searchable && (
              <CommandInput
                className="p-2 border-b border-gray-300"
                placeholder={searchPlaceholder ?? "Search"}
                onChangeCapture={(e) => setQuery(e.currentTarget.value)}
                data-testid="select-search-field"
              />
            )}
            <CommandList label="Select an option">
              {isInProgress ? (
                <CommandGroup>
                  <span>Loading...</span>
                </CommandGroup>
              ) : (
                <>
                  <CommandEmpty>{searchable ? "No results found." : ""}</CommandEmpty>
                  <CommandGroup>
                    {_options.map((option, index) => {
                      const optionValue = option?.value ?? option;
                      const label = option?.label ?? optionValue;
                      const children = option?.children;
                      const isIndeterminate = multiple && children?.some((child) => isSelected(child));
                      const isOptionSelected =
                        multiple && children ? children?.every((child) => isSelected(child)) : isSelected(optionValue);

                      if (children) {
                        return (
                          <CommandGroup key={index}>
                            {multiple ? (
                              <Option
                                multiple={multiple}
                                label={label}
                                isIndeterminate={!isOptionSelected && isIndeterminate}
                                isOptionSelected={isOptionSelected}
                                className="pl-0"
                                onSelect={() => {
                                  children.forEach((child: SelectOption<T>) => {
                                    const childVal = child?.value ?? child;
                                    isOptionSelected ? _onChange(childVal, true) : _onChange(childVal, false);
                                  });
                                }}
                              />
                            ) : (
                              <div className="pl-1 font-bold">{label}</div>
                            )}
                            <div className="pl-2">
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
                            </div>
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
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
        <input {...props} type="hidden" name={props?.name} value={value ?? ""} ref={ref} disabled={disabled} />
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

const Option = ({
  value,
  label,
  isOptionSelected,
  isIndeterminate,
  disabled,
  style,
  onSelect,
  multiple,
  classname,
}: OptionProps) => {
  const keyDownHandler = useCallback(
    (e: any) => {
      if (["Enter", " "].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(value);
      }
    },
    [onSelect, value],
  );
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      disabled={disabled}
      {...(disabled ? { "data-disabled": true } : {})}
      {...(style ? { style } : {})}
      data-selected={isOptionSelected}
      data-testid="select-option"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={keyDownHandler}
      className={classname}
    >
      {multiple && <Checkbox tabIndex={-1} checked={isOptionSelected} indeterminate={isIndeterminate} />}
      <div data-testid="select-option-label" className="w-full truncate">
        {label}
      </div>
    </CommandItem>
  );
};

Select.displayName = "Select";
