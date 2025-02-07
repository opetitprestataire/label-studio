import styles from "./PersonalAccessToken.module.scss";
import { API } from "/apps/labelstudio/src/providers/ApiProvider";
import { modal } from "/apps/labelstudio/src/components/Modal/Modal";
import { Button } from "/apps/labelstudio/src/components/Button/Button";
import { Input, Label } from "/apps/labelstudio/src/components/Form/Elements";
import { Callout, CalloutContent, CalloutHeader, CalloutIcon, CalloutTitle } from "@humansignal/ui/lib/callout/callout";
import { IconWarning } from "@humansignal/icons";
// import { Label } from "@humansignal/ui";
import { atomWithMutation, atomWithQuery } from "jotai-tanstack-query";
import { useAtomValue } from "jotai";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { format } from "date-fns";

type Token = {
  token: string;
  expires_at: string;
};

const tokensListAtom = atomWithQuery(() => ({
  queryKey: ["access-tokens"],
  async queryFn() {
    const tokens = await API.tokensList();
    console.log(tokens);
    return tokens as Token[];
  },
}));

const createTokenAtom = atomWithMutation(() => ({
  mutationKey: ["create-token"],
  async mutationFn() {
    const token = await API.createToken();
    return {
      token: "hello",
      expires_at: new Date().toISOString(),
    };
  },
}));

const tokensAtom = atomWithQuery((get) => ({
  queryKey: ["tokens", get(tokensListAtom), get(createTokenAtom)],
  async queryFn() {
    const list = get(tokensListAtom).data;
    const created = get(createTokenAtom).data;
    return [...(list ?? []), created].filter(Boolean);
  },
}));

export function PersonalJWTToken() {
  const [dialogOpened, setDialogOpened] = useState(false);
  const tokens = useAtomValue(tokensAtom);
  const tokensListClassName = clsx({
    [styles.tokensList]: tokens.data && tokens.data.length,
  });

  function openDialog() {
    if (dialogOpened) return;
    setDialogOpened(true);
    modal({
      visible: true,
      title: "New Auth Token",
      style: { width: 680 },
      body: CreateTokenForm,
      onHidden: () => setDialogOpened(false),
    });
  }

  return (
    <div className={styles.personalAccessToken}>
      <div className={tokensListClassName}>
        {tokens.isLoading ? (
          <div>loading...</div>
        ) : tokens.isSuccess ? (
          <div>
            <Label text="Access Token" className={styles.label} />
            <div className="flex flex-col gap-2">
              {tokens.data.map((token, index) => {
                return (
                  <div key={`${token.expires_at}${index}`} className="flex justify-between items-center">
                    <div>{format(new Date(token.expires_at), "MMM dd, yyyy HH:mm")}</div>
                    <Button look="destructive">Revoke</Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tokens.isError ? (
          <div>Unable to load tokens list</div>
        ) : null}
      </div>
      <Button disabled={tokens.isLoading || (tokens.data?.length ?? 0) > 0} onClick={openDialog}>
        Create New Token
      </Button>
    </div>
  );
}

function CreateTokenForm() {
  const { data, mutate } = useAtomValue(createTokenAtom);

  useEffect(() => mutate(), []);

  return (
    <div className="flex flex-col gap-2">
      <p>Copy your new access token from below and keep it secure. </p>

      <div className="flex items-end w-full gap-2">
        <Input
          label="Access Token"
          labelProps={{ className: "flex-1" }}
          className="w-full"
          readOnly
          value={data?.token}
        />
        <Button>Copy</Button>
      </div>

      <div>
        <Label text="Token Expiry Date" />
        {data && format(new Date(data?.expires_at), "MMM dd, yyyy HH:mm z")}
      </div>

      <Callout variant="warning">
        <CalloutHeader>
          <CalloutIcon>
            <IconWarning />
          </CalloutIcon>
          <CalloutTitle>Manage your access tokens securely</CalloutTitle>
        </CalloutHeader>
        <CalloutContent>
          Do not share this key with anyone. If you suspect any keys have been compromised, you should revoke them and
          create new ones.
        </CalloutContent>
      </Callout>
    </div>
  );
}
