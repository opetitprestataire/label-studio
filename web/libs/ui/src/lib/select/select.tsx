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
import type { SelectOption, SelectProps } from "./types.ts";
import { Checkbox } from "@humansignal/ui";
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
    let initialValue =
      defaultValue?.value ??
      defaultValue ??
      externalValue?.value ??
      externalValue ??
      options?.[0]?.value ??
      options?.[0]?.children?.[0]?.value ??
      options?.[0]?.children?.[0] ??
      options?.[0];

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

    return (
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
        <PopoverContent className="z-99999" asChild={false} align="start">
          <Command>
            {searchable && (
              <CommandInput
                className="p-2 border-b border-gray-300"
                placeholder={searchPlaceholder ?? "Search"}
                onChangeCapture={(e) => setQuery(e.currentTarget.value)}
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
                        <div>{label}</div>
                        {children.map((item, i) => {
                          const val = item?.value ?? item;
                          const lab = item?.label ?? val;
                          const isChildOptionSelected = isSelected(val);
                          return (
                            <CommandItem
                              key={`${val}_${i}`}
                              value={val}
                              onSelect={() => {
                                _onChange(val, isChildOptionSelected);
                              }}
                              disabled={option?.disabled}
                              {...(item?.disabled ? { "data-disabled": true } : {})}
                              {...(item?.style ? { style: item.style } : {})}
                            >
                              {multiple ? (
                                <Checkbox
                                  className={clsx("mr-2 h-4 w-4", isChildOptionSelected ? "opacity-100" : "opacity-0")}
                                  checked={isChildOptionSelected}
                                />
                              ) : isChildOptionSelected ? (
                                <IconCheck className="mr-2 h-4 w-4" />
                              ) : null}
                              {lab}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    );
                  }
                  return (
                    <CommandItem
                      key={`${optionValue}_${index}`}
                      value={optionValue}
                      onSelect={() => {
                        console.log("optionValue", optionValue);
                        _onChange(optionValue, isOptionSelected);
                      }}
                      disabled={option?.disabled}
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
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        <input  {...props} type="hidden" name={props?.name} value={value} ref={ref} disabled={disabled} />
      </Popover>
    );
    // return (
    //   <SelectComponent value={value} onValueChange={_onChange} disabled={disabled} {...props}>
    //     {label && <Label {...labelProps}>{label}</Label>}
    //     <SelectTrigger disabled={disabled} {...(props?.triggerProps ?? {})}>
    //       <SelectValue placeholder={props?.placeholder}  data-testid="select"/>
    //     </SelectTrigger>
    //     <SelectContent>
    //       {searchable && (
    //         <div className="search">
    //           <input
    //             className="border border-gray-300 text-gray-900 text-md rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2"
    //             type="text"
    //             placeholder={searchPlaceholder ?? "Search"}
    //             value={query}
    //             onChange={(e) => setQuery(e.target.value)}
    //           />
    //         </div>
    //       )}
    //       {_options.map((option, index) => {
    //         const value = option?.value ?? option;
    //         const label = option?.label ?? value;
    //         const children = option?.children;

    //         if (children) {
    //           return (
    //             <SelectGroup key={index}>
    //               <SelectLabel>{label}</SelectLabel>
    //               {children.map((item, i) => {
    //                 const val = item?.value ?? item;
    //                 const lab = item?.label ?? val;
    //                 return (
    //                   <SelectItem
    //                     key={`${lab}_${i}`}
    //                     value={val}
    //                     {...(item?.disabled ? { "data-disabled": true } : {})}
    //                     {...(item?.style ? { style: item.style } : {})}
    //                   >
    //                     {lab}
    //                   </SelectItem>
    //                 );
    //               })}
    //             </SelectGroup>
    //           );
    //         }

    //         return (
    //           <SelectItem
    //             key={index}
    //             value={value}
    //             {...(option?.disabled ? { "data-disabled": true } : {})}
    //             {...(option?.style ? { style: option.style } : {})}
    //           >
    //             {label}
    //           </SelectItem>
    //         );
    //       })}
    //     </SelectContent>
    //   </SelectComponent>
    // );
  },
);

Select.displayName = "Select";
