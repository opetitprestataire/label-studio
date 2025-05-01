import { observer } from "mobx-react";
import { FilterDropdown } from "../FilterDropdown";
import { useSDK } from "../../../providers/SDKProvider";
// import { Common } from "./Common";

export const VariantSelect = observer(({ filter, schema, onChange, multiple, value, placeholder }) => {
  if (!schema) return <></>;
  const { items } = schema;
  const sdk = useSDK();

  const selectedValue = (() => {
    if (!multiple) {
      return Array.isArray(value) ? value[0] : value;
    }
    return Array.isArray(value) ? value : (value ?? []);
  })();

  const FilterItem = filter.cellView?.FilterItem;

  // Filter out users with firstName "Deleted" for annotator filters
  const filteredItems =
    filter.field?.alias === "annotators" || filter.field?.alias === "reviewers"
      ? (items?.toJSON ? items.toJSON() : items).filter((item) => {
          const user = sdk.store.users.find((u) => u.id === item);
          return !(user?.firstName === "Deleted" && user?.lastName === "User");
        })
      : items?.toJSON
        ? items.toJSON()
        : items;

  return (
    <FilterDropdown
      items={filteredItems}
      value={selectedValue}
      multiple={multiple}
      optionRender={FilterItem}
      outputFormat={
        multiple
          ? (value) => {
              return value ? [].concat(value) : [];
            }
          : undefined
      }
      searchFilter={filter.cellView?.searchFilter}
      onChange={(value) => onChange(value)}
      placeholder={placeholder ?? "Select value"}
    />
  );
});

export const ListFilter = [
  {
    key: "contains",
    label: "contains",
    valueType: "single",
    input: (props) => <VariantSelect {...props} multiple />,
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "single",
    input: (props) => <VariantSelect {...props} multiple />,
  },
  // ... Common,
];
