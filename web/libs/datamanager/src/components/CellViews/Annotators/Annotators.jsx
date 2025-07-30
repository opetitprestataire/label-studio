import { inject } from "mobx-react";
import clsx from "clsx";
import { useMemo } from "react";
import { useSDK } from "../../../providers/SDKProvider";
import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { Space } from "../../Common/Space/Space";
import { IconCheckAlt, IconCrossAlt } from "@humansignal/icons";
import { Tooltip, Userpic } from "@humansignal/ui";
import { Common } from "../../Filters/types";
import { VariantSelect } from "../../Filters/types/List";
import { FF_DISABLE_GLOBAL_USER_FETCHING, isFF } from "../../../utils/feature-flags";
import "./Annotators.scss";

export const Annotators = (cell) => {
  const { value, column, original: task } = cell;
  const sdk = useSDK();
  const maxUsersToDisplay = window.APP_SETTINGS.data_manager.max_users_to_display;
  const userList = Array.from(value).slice(0, maxUsersToDisplay);
  const userPickBadge = cn("userpic-badge");
  const annotatorsCN = cn("annotators");
  const isEnterprise = window.APP_SETTINGS.billing?.enterprise;

  // Memoize the count field calculation
  const extraCount = useMemo(() => {
    const getCountField = () => {
      switch (column.alias) {
        case "annotators":
          return task?.annotators_count || 0;
        case "reviewers":
          return task?.reviewers_count || 0;
        case "comment_authors":
          return task?.comment_authors_count || 0;
        default:
          return 0;
      }
    };

    return getCountField() - maxUsersToDisplay;
  }, [column.alias, task?.annotators_count, task?.reviewers_count, task?.comment_authors_count]);

  return (
    <div className={annotatorsCN.toString()}>
      {userList.map((item, index) => {
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
      {extraCount > 0 && (
        <div
          className={annotatorsCN.elem("item").toString()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            sdk.invoke("userCellCounterClick", e, column.alias, task, userList);
          }}
        >
          <Userpic addCount={`+${extraCount}`} />
        </div>
      )}
    </div>
  );
};

const UsersInjector = inject(({ store }) => {
  return {
    users: store.users,
  };
});

Annotators.filterItems = (items) => {
  return items.filter((userId) => {
    // @todo: remove this once the new user select is finished
    // If global user fetching is disabled or usersMap is not available,
    // we can't filter out deleted users
    // In this case, we assume all users are valid
    if (isFF(FF_DISABLE_GLOBAL_USER_FETCHING) || !DM.usersMap) {
      return true;
    }

    const user = DM.usersMap.get(userId);
    return !(user?.firstName === "Deleted" && user?.lastName === "User");
  });
};

Annotators.FilterItem = UsersInjector(({ item }) => {
  // @todo: remove this once the new user select is finished
  // If global user fetching is disabled or usersMap is not available, show a fallback display
  if (isFF(FF_DISABLE_GLOBAL_USER_FETCHING) || !DM.usersMap) {
    return (
      <Space size="small">
        <Userpic size={16} key={`user-${item}`} />
        User {item}
      </Space>
    );
  }

  const user = DM.usersMap.get(item);

  return user ? (
    <Space size="small">
      <Userpic user={user} size={16} key={`user-${item}`} />
      {user.displayName}
    </Space>
  ) : (
    <Space size="small">
      <Userpic size={16} key={`user-${item}`} />
      User {item}
    </Space>
  );
});

Annotators.searchFilter = (option, queryString) => {
  // @todo: remove this once the new user select is finished
  // If global user fetching is disabled or usersMap is not available, we can only search by ID
  if (isFF(FF_DISABLE_GLOBAL_USER_FETCHING) || !DM.usersMap) {
    return option?.value?.toString().toLowerCase().includes(queryString.toLowerCase());
  }

  const user = DM.usersMap.get(option?.value);
  if (!user) {
    // Fallback to searching by ID if user not found
    return option?.value?.toString().toLowerCase().includes(queryString.toLowerCase());
  }

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
    input: (props) => <VariantSelect {...props} />,
  },
  {
    key: "not_contains",
    label: "not contains",
    valueType: "list",
    input: (props) => <VariantSelect {...props} />,
  },
  ...Common,
];
