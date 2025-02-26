import { format } from "date-fns";
import styles from "./MembershipInfo.module.scss";
import { useQuery } from "@tanstack/react-query";

/**
 * FIXME: This is legacy imports. We're not supposed to use such statements
 * each one of these eventually has to be migrated to core/ui
 */
import { useCurrentUser } from "/apps/labelstudio/src/providers/CurrentUser";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { useMemo } from "react";

function formatDate(date?: string) {
  return format(new Date(date ?? ""), "dd MMM yyyy, KK:mm a");
}

export const MembershipInfo = () => {
  const { user } = useCurrentUser();
  const dateJoined = useMemo(() => {
    if (!user?.date_joined) return null;
    return formatDate(user?.date_joined);
  }, [user?.date_joined]);

  const membership = useQuery({
    queryKey: [user?.active_organization, user?.id, "user-membership"],
    async queryFn() {
      if (!user) return {};
      const response = await API.invoke("userMemberships", {
        pk: user.active_organization,
        userPk: user.id,
      });

      const registrationDate = formatDate(response?.created_at);
      const annotationCount = response?.annotations_count;
      const contributions = response?.contributed_projects_count;
      let role = "Owner";

      switch (response.role) {
        case "OW":
          role = "Owner";
          break;
        case "DI":
          role = "Deactivated";
          break;
        case "AD":
          role = "Administrator";
          break;
        case "MA":
          role = "Manager";
          break;
        case "AN":
          role = "Annotator";
          break;
        case "RE":
          role = "Reviewer";
          break;
        case "NO":
          role = "Pending";
          break;
      }

      return {
        registrationDate,
        annotationCount,
        contributions,
        role,
      };
    },
  });

  const organization = useQuery({
    queryKey: ["organization", user?.active_organization],
    async queryFn() {
      if (!user) return null;
      if (!window?.APP_SETTINGS?.billing) return null;
      const organization = await API.invoke("organization", {
        pk: user.active_organization,
      });

      return organization ? { ...organization, createdAt: formatDate(organization.created_at) } : null;
    },
  });

  return (
    <div className={styles.membershipInfo} id="membership-info">
      <div className="flex gap-2 w-full justify-between">
        <div>User ID</div>
        <div>{user?.id}</div>
      </div>

      <div className="flex gap-2 w-full justify-between">
        <div>Registration date</div>
        <div>{dateJoined}</div>
      </div>

      <div className="flex gap-2 w-full justify-between">
        <div>Annotations Submitted</div>
        <div>{membership.data?.annotationCount}</div>
      </div>

      <div className="flex gap-2 w-full justify-between">
        <div>Projects contributed to</div>
        <div>{membership.data?.contributions}</div>
      </div>

      <div className={styles.divider} />

      {organization.data?.title && (
        <div className="flex gap-2 w-full justify-between">
          <div>Organization</div>
          <div>
            <a href="/organization">{organization.data.title}</a>
          </div>
        </div>
      )}

      {membership.data?.role && (
        <div className="flex gap-2 w-full justify-between">
          <div>My role</div>
          <div>{membership.data.role}</div>
        </div>
      )}

      <div className="flex gap-2 w-full justify-between">
        <div>Organization ID</div>
        <div>{user?.active_organization}</div>
      </div>

      {organization.data.created_at && (
        <div className="flex gap-2 w-full justify-between">
          <div>Created</div>
          <div>{organization.data?.createdAt}</div>
        </div>
      )}
    </div>
  );
};
