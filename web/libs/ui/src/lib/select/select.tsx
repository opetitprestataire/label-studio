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
import styles from "./select.module.scss";

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
      className,
      size,
      searchFilter,
      onSearch,
      ...props
    }: SelectProps<T, A>,
    ref: ForwardedRef<HTMLSelectElement>,
  ) => {
    const triggerRef = useRef<HTMLDivElement>();
    const [query, setQuery] = useState<string>("");
    let initialValue = defaultValue?.value ?? defaultValue ?? externalValue?.value ?? externalValue;

    if (multiple) {
      initialValue = Array.isArray(initialValue) ? (initialValue ?? []) : [initialValue];
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
        !multiple && setIsOpen(false);
        setTimeout(() => {
          const changeEvent = new Event("change", { bubbles: true, target: ref?.current, currentTarget: ref?.current });
          ref?.current?.dispatchEvent?.(changeEvent);
        }, 0);
      },
      [props?.onChange, multiple, disabled],
    );

    const flatOptions = useMemo(() => {
      return options.flatMap((option) => option?.children ?? option);
    }, [options]);

    const _options = useMemo(() => {
      if (!searchable || !query.trim()) return options;

      const filterHandler = (option: any, queryString: string) => {
        const value = option?.value ?? option;
        const label = option?.label ?? option?.value ?? option;
        return (
          label?.toString()?.toLowerCase().includes(queryString.toLowerCase()) ||
          value?.toString()?.toLowerCase().includes(queryString.toLowerCase())
        );
      };
      return flatOptions.filter((option) => (searchFilter ?? filterHandler)(option, query));
    }, [options, flatOptions, searchable, query, searchFilter]);

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

    const onSearchInputHandler = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onSearch?.(val);
      },
      [setQuery, onSearch],
    );

    const selectChangeHandler = useCallback(() => {
      props?.onChange?.(value);
    }, [value, props?.onChange]);

    const combobox = (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild={true} disabled={disabled}>
          <button
            variant="outline"
            aria-expanded={isOpen}
            className={clsx(isInline ? "w-auto" : "w-full", className ?? "", styles.selectTrigger, {
              [styles.isOpen]: isOpen,
              [styles.isDisabled]: disabled,
              [styles.sizeSmall]: size === "small",
              [styles.sizeMedium]: size === "medium",
              [styles.sizeLarge]: size === "large",
            })}
            type="button"
            data-testid={props?.dataTestid ?? `select-trigger${value ? `-${value}` : ""}`}
            ref={triggerRef}
            data-name={props?.name}
            data-value={value ?? ""}
            {...triggerProps}
          >
            <span className="flex flex-1 text-left gap-2 leading-none max-w-full" data-testid="select-display-value">
              {selectedOptions?.length ? (
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
                <span className="truncate w-full">{props?.placeholder ?? ""}</span>
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
          {isInProgress ? (
            <span className={styles.selectLoading} tabIndex={-1}>
              Loading...
            </span>
          ) : (
            <Command shouldFilter={false}>
              {searchable && (
                <CommandInput
                  placeholder={searchPlaceholder ?? "Search"}
                  onChangeCapture={onSearchInputHandler}
                  data-testid="select-search-field"
                />
              )}
              <CommandList label="Select an option">
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
              </CommandList>
            </Command>
          )}
        </PopoverContent>
        <select
          name={props?.name}
          value={value ?? ""}
          ref={ref}
          disabled={disabled}
          className={styles.valueInput}
          onChange={selectChangeHandler}
          onSelect={selectChangeHandler}
        >
          {selectedOptions?.map((option, index) => (
            <option key={`${option?.value}_${index}`} value={option?.value ?? option} selected />
          ))}
        </select>
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
  className,
}: OptionProps) => {
  const keyDownHandler = useCallback(
    (e: any) => {
      if (["Enter", " "].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(value);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        const nextElement = e.currentTarget.nextElementSibling;
        if (nextElement) {
          nextElement.focus();
        }
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        const prevElement = e.currentTarget.previousElementSibling;
        if (prevElement) {
          prevElement.focus();
        }
      }
    },
    [onSelect, value],
  );
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      disabled={disabled}
      {...(style ? { style } : {})}
      data-value={value}
      data-selected={isOptionSelected}
      data-testid={`select-option-${value}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={keyDownHandler}
      className={clsx(
        className,
        [
          "rounded-4",
          "text-neutral-content",
          "[&_[cmdk-group-heading]]:text-muted-foreground",
          "overflow-hidden",
          "p-1",
          "[&_[cmdk-group-heading]]:text-xs",
          "[&_[cmdk-group-heading]]:font-medium",
          "focus-within:outline-none",
          "focus-within:bg-primary-focus-outline",
          "group",
        ],
        [
          "data-[disabled=true]:opacity-50",
          "data-[disabled=true]:cursor-not-allowed",
          "data-[disabled=true]:bg-transparent",
        ],
      )}
    >
      <div
        className={clsx(
          [
            "w-full",
            "px-4",
            "py-1",
            "hover:bg-primary-emphasis-subtle",
            "hover:cursor-pointer",
            "group-focus-within:bg-accent-grape-subtlest",
            "rounded-4",
            "hover:data-[disabled=true]:bg-transparent",
            "hover:data-[disabled=true]:cursor-not-allowed",
          ],
          isOptionSelected && ["bg-primary-emphasis"],
        )}
        data-disabled={disabled}
      >
        {multiple && <Checkbox tabIndex={-1} checked={isOptionSelected} indeterminate={isIndeterminate} readOnly />}
        <div data-testid="select-option-label" className="w-full truncate">
          {label}
        </div>
      </div>
    </CommandItem>
  );
};

Select.displayName = "Select";
