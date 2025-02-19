import { useAtomValue } from "jotai";
import { formDataToJPO } from "@humansignal/core/lib/utils/helpers";
import { saveSettingsAtom, settingsAtom } from "@humansignal/core/pages/AccountSettings/atoms";
import type { AuthTokenSettings } from "@humansignal/core/pages/AccountSettings/types";
import { useEffect, useRef, useState } from "react";
import styles from "./styles.module.scss";

import { Form, Input, Toggle } from "apps/labelstudio/src/components/Form";
import { Button } from "apps/labelstudio/src/components/Button/Button";
import { IconCheck } from "apps/labelstudio/src/assets/icons";

export const TokenSettingsModal = ({
  showTTL,
}: {
  showTTL?: boolean;
}) => {
  const settings = useAtomValue(settingsAtom);
  const formRef = useRef<Form>();
  const { mutate: saveSettings, isPending, isSuccess, isIdle } = useAtomValue(saveSettingsAtom);
  const [saved, setSaved] = useState(false);
  const onSubmit = () => {
    const form = formRef.current.formElement.current as HTMLFormElement;
    const data = formDataToJPO(new FormData(form));
    const body = {
      ...data,
      api_tokens_enabled: data.api_tokens_enabled === "on",
      legacy_api_tokens_enabled: data.legacy_api_tokens_enabled === "on",
    } satisfies Partial<AuthTokenSettings>;
    saveSettings(body);
    setSaved(true);
  };

  useEffect(() => {
    if (saved) {
      setTimeout(() => setSaved(false), 2000);
    }
  }, [saved]);
  return (
    <Form ref={formRef}>
      <Form.Row columnCount={1}>
        <Toggle
          label="Personal Access Tokens"
          name="api_tokens_enabled"
          description="Enable increased token authentication security"
          checked={settings.data?.api_tokens_enabled ?? false}
        />
      </Form.Row>
      <Form.Row columnCount={1}>
        <Toggle
          label="Legacy Tokens"
          name="legacy_api_tokens_enabled"
          description="Enable legacy access tokens"
          checked={settings.data?.legacy_api_tokens_enabled}
        />
      </Form.Row>
      {showTTL === true && (
        <Form.Row columnCount={1}>
          <Input
            name="api_token_ttl_days"
            label="Personal Access Token Time-to-Live"
            description="The number of days, after creation, that the token will be valid for. After this time period a user will need to create a new access token"
            labelProps={{
              description:
                "The number of days, after creation, that the token will be valid for. After this time period a user will need to create a new access token",
            }}
            disabled={!settings.data?.api_tokens_enabled}
            type="number"
            min={10}
            max={365}
            value={settings.data?.time_to_live ?? 30}
          />
        </Form.Row>
      )}
      <Form.Actions>
        {saved && (
          <div className={styles.success}>
            <IconCheck /> Saved!
          </div>
        )}
        <Button type="button" onClick={onSubmit} disabled={isPending || saved}>
          Save
        </Button>
      </Form.Actions>
    </Form>
  );
};
