import { useCallback, useMemo, useRef, useState } from "react";
import { Checkbox, Spinner } from "@humansignal/ui";

/**
 * FIXME: This is legacy imports. We're not supposed to use such statements
 * each one of these eventually has to be migrated to core/ui
 */
import { useAPI } from "apps/labelstudio/src/providers/ApiProvider";
import { useConfig } from "apps/labelstudio/src/providers/ConfigProvider";
import { useCurrentUser } from "apps/labelstudio/src/providers/CurrentUser";
import { ff } from "@humansignal/core";

type NotificationCheckboxProps = {
  id: string;
  label: string;
  checked: boolean;
  onToggle: (e: React.ChangeEvent<HTMLInputElement>, id: string, setLoading: (isLoading: boolean) => void) => void;
};

const NotificationCheckbox = ({ id, label, checked, onToggle }: NotificationCheckboxProps) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} disabled={isLoading} onChange={(e) => onToggle(e, id, setIsLoading)}>
        {label}
      </Checkbox>
      {isLoading && <Spinner className="h-full" />}
    </div>
  );
};

export const EmailPreferences = () => {
  const isEnterpriseEmailNotificationsEnabledRef = useRef(
    ff.isActive(ff.FF_ENTERPRISE_EMAIL_NOTIFICATIONS) && window.APP_SETTINGS?.billing?.enterprise,
  );
  const config = useConfig();
  const { user } = useCurrentUser();
  const api = useAPI();
  const [isAllowNewsLetter, setIsAllowNewsLetter] = useState(config.user.allow_newsletters);

  const toggleHandler = useCallback(
    async (e: any, name: string, setIsLoading: (isLoading: boolean) => void) => {
      if (name === "allow_newsletters") {
        setIsAllowNewsLetter(e.target.checked);
      }
      setIsLoading(true);
      await api.callApi("updateUser", {
        params: {
          pk: user?.id,
        },
        body: {
          [name]: e.target.checked ? 1 : 0,
        },
      });
      setIsLoading(false);
    },
    [user?.id],
  );

  const message = useMemo(() => {
    return window.APP_SETTINGS?.whitelabel_is_active
      ? "Subscribe for news and tips"
      : "Subscribe to HumanSignal news and tips from Heidi";
  }, []);
  const emailNotificationSettings = user?.lse_fields?.email_notification_settings ?? {};

  return (
    <div id="email-preferences" className="flex flex-col gap-4">
      <NotificationCheckbox
        id="allow_newsletters"
        label={message}
        checked={isAllowNewsLetter}
        onToggle={toggleHandler}
      />

      {isEnterpriseEmailNotificationsEnabledRef.current && (
        <>
          {Object.entries(emailNotificationSettings).map(([id, { value, label }]: [string, any]) => (
            <NotificationCheckbox key={id} id={id} label={label} checked={value} onToggle={toggleHandler} />
          ))}
        </>
      )}
    </div>
  );
};
