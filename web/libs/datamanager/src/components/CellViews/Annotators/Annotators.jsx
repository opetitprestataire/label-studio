import { inject } from "mobx-react";
import clsx from "clsx";
import { useSDK } from "../../../providers/SDKProvider";
import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { Space } from "../../Common/Space/Space";
import { IconCheckAlt, IconCrossAlt } from "@humansignal/icons";
import { Tooltip, Userpic } from "@humansignal/ui";
import { Common } from "../../Filters/types";
import { observer } from "mobx-react";
import { Select } from "@humansignal/ui";
import "./Annotators.scss";
import { useState, useMemo } from "react";
import { useDataManagerUsers } from "./useUsers";

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
  ({ filter, schema, onChange, multiple, value, placeholder, disabled, ...rest }) => {
    if (!schema) return <></>;
    const { items } = schema;
    const [selectedValue, setSelectedValue] = useState(value);

    // Get project ID from the filter context or use a default
    const projectId = filter?.view?.project?.id || 1;

    const { users, hasMore, loadMore } = useDataManagerUsers(projectId, 5);
    const options = useMemo(() => {
      return users.map((user) => {
        return {
          value: user.id,
          label: (
            <Tooltip title={user.displayName ?? user.username}>
              <div className="flex gap-2 w-full items-center">
                <Userpic user={user} size={16} key={`user-${user.id}`} showName={true} rawClassName="flex-0" />
                <span className="text-ellipsis text-nowrap overflow-hidden w-full">
                  {user.displayName ?? user.username}
                </span>
              </div>
            </Tooltip>
          ),
        };
      });
    }, [users, hasMore, loadMore]);

    // Convert users data to options format for Select component
    return (
      <Select
        options={options}
        value={selectedValue}
        onChange={(val) => {
          setSelectedValue(val);
          onChange?.(val);
        }}
        triggerClassName={cn("form-select").elem("list").toString()}
        loadMore={loadMore}
        size={"small"}
        placeholder={placeholder}
        disabled={disabled}
        multiple={multiple}
        isVirtualList={true}
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
    input: (props) => <InfiniteVariantSelect {...props} test={true} />,
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "list",
    input: (props) => <InfiniteVariantSelect {...props} test={true} />,
  },
  ...Common,
];
