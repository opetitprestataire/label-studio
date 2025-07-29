import { inject, observer } from "mobx-react";
import clsx from "clsx";
import { useSDK } from "../../../providers/SDKProvider";
import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { debounce } from "../../../utils/debounce";
import { Space } from "../../Common/Space/Space";
import { IconCheckAlt, IconCrossAlt } from "@humansignal/icons";
import { Tooltip, Userpic } from "@humansignal/ui";
import { Common } from "../../Filters/types";
import { Select } from "@humansignal/ui";
import "./Annotators.scss";
import { useState, useMemo, useCallback } from "react";
import { useDataManagerUsers } from "./useUsers";
import { isFF, FF_DM_FILTER_MEMBERS } from "../../../utils/feature-flags";
import { VariantSelect } from "../../Filters/types/List";

const isFilterMembers = isFF(FF_DM_FILTER_MEMBERS);
const DEBOUNCE_DELAY = 300;

export const Annotators = (cell) => {
  const { value, column, original: task } = cell;
  const sdk = useSDK();
  const userList = Array.from(value);
  const renderable = userList.slice(0, 10);
  const extra = userList.length - renderable.length;
  const userPickBadge = cn("userpic-badge");
  const annotatorsCN = cn("annotators");
  const isEnterprise = window.APP_SETTINGS.billing?.enterprise;

  return (
    <div className={annotatorsCN.toString()}>
      {renderable.map((item, index) => {
        const user = item.user ?? item;
        const { annotated, reviewed, review } = item;

        const userpicIsFaded =
          (isDefined(annotated) && annotated === false) || (isDefined(reviewed) && reviewed === false && isEnterprise);
        const suppressStats = column.alias === "comment_authors";

        return (
          <div
            key={`user-${user.id}-${index}`}
            className={annotatorsCN.elem("item").toString()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              sdk.invoke("userCellClick", e, column.alias, task, user, suppressStats);
            }}
          >
            <Tooltip title={user.fullName || user.email}>
              <Userpic
                user={user}
                faded={userpicIsFaded}
                badge={{
                  bottomRight: review && (
                    <div className={clsx(userPickBadge.toString(), userPickBadge.mod({ [review]: true }).toString())}>
                      {review === "rejected" ? <IconCrossAlt /> : <IconCheckAlt />}
                    </div>
                  ),
                }}
              />
            </Tooltip>
          </div>
        );
      })}
      {extra > 0 && (
        <div
          className={annotatorsCN.elem("item").toString()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sdk.invoke("userCellCounterClick", e, column.alias, task, userList);
          }}
        >
          <Userpic addCount={`+${extra}`} />
        </div>
      )}
    </div>
  );
};

export const InfiniteVariantSelect = observer(
  ({ filter, schema, onChange, multiple, value, placeholder, disabled, id }) => {
    if (!schema) return <></>;
    const { items } = schema;
    const [search, setSearch] = useState(null);
    const [selectedValue, setSelectedValue] = useState(value);

    // Get project ID from the filter context or use a default
    const projectId = filter?.view?.project?.id || 1;
    const optionsPerRequest = 10;

    const debouncedSearch = useCallback(
      debounce((val) => setSearch(val), DEBOUNCE_DELAY),
      [],
    );

    const { users, hasMore, total, loadMore } = useDataManagerUsers(
      projectId,
      optionsPerRequest,
      false,
      null,
      search,
      selectedValue,
    );
    const options = useMemo(() => {
      return users.map((user) => {
        return {
          value: user.id,
          label: (
            <Tooltip title={user.displayName ?? user.username} alignment="top-left">
              <div className="flex gap-2 w-full items-center">
                <Userpic user={user} size={16} key={`user-${user.id}`} showName={true} />
                <span className="text-ellipsis text-nowrap overflow-hidden w-full">
                  {user.displayName ?? user.username}
                </span>
              </div>
            </Tooltip>
          ),
        };
      });
    }, [users, hasMore, loadMore]);

    const _onChange = useCallback(
      (val) => {
        setSelectedValue(val);
        onChange?.(val);
        setSearch(null);
      },
      [onChange],
    );

    // Convert users data to options format for Select component
    return (
      <Select
        options={options}
        value={selectedValue}
        onChange={_onChange}
        triggerClassName={cn("form-select").elem("list").toString()}
        loadMore={loadMore}
        size={"small"}
        placeholder={placeholder}
        disabled={disabled}
        multiple={multiple}
        isVirtualList={true}
        searchable={true}
        onSearch={debouncedSearch}
        searchFilter={Annotators.searchFilter}
        itemCount={total}
        triggerClassName="w-[200px]"
      />
    );
  },
);

const UsersInjector = inject(({ store }) => {
  return {
    users: store.users,
  };
});

Annotators.filterItems = (items) => {
  return items.filter((userId) => {
    const user = DM.usersMap.get(userId);
    return !(user?.firstName === "Deleted" && user?.lastName === "User");
  });
};

Annotators.FilterItem = UsersInjector(({ item }) => {
  const user = DM.usersMap.get(item);

  return user ? (
    <Space size="small">
      <Userpic user={user} size={16} key={`user-${item}`} />
      {user.displayName}
    </Space>
  ) : null;
});

Annotators.searchFilter = (option, queryString) => {
  const user = DM.usersMap.get(option?.value);
  return (
    user.id?.toString().toLowerCase().includes(queryString.toLowerCase()) ||
    user.email.toLowerCase().includes(queryString.toLowerCase()) ||
    user.displayName.toLowerCase().includes(queryString.toLowerCase())
  );
};

Annotators.filterable = true;
Annotators.customOperators = [
  {
    key: "contains",
    label: "contains",
    valueType: "list",
    input: (props) => (isFilterMembers ? <InfiniteVariantSelect {...props} /> : <VariantSelect {...props} />),
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "list",
    input: (props) => (isFilterMembers ? <InfiniteVariantSelect {...props} /> : <VariantSelect {...props} />),
  },
  ...Common,
];
