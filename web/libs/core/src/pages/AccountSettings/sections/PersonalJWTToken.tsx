import styles from "./PersonalAccessToken.module.scss";
import { API } from "/apps/labelstudio/src/providers/ApiProvider";
import { modal } from "/apps/labelstudio/src/components/Modal/Modal";
import { Button } from "/apps/labelstudio/src/components/Button/Button";
import { Input, Label } from "/apps/labelstudio/src/components/Form/Elements";
import { Callout, CalloutContent, CalloutHeader, CalloutIcon, CalloutTitle } from "@humansignal/ui/lib/callout/callout";
import { IconWarning } from "@humansignal/icons";
import { atomWithMutation, atomWithQuery, queryClientAtom } from "jotai-tanstack-query";
import { useAtomValue } from "jotai";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";

type Token = {
  token: string;
  expires_at: string;
};

const ACCESS_TOKENS_QUERY_KEY = ["access-tokens"];

// list all existing API tokens
const tokensListAtom = atomWithQuery(() => ({
  queryKey: ACCESS_TOKENS_QUERY_KEY,
  async queryFn() {
    console.log("loading tokens list");
    const tokens = await API.invoke("accessTokenList");
    if (!tokens.$meta.ok) {
      throw new Error(tokens.error);
    }

    return tokens as Token[];
  },
}));

// despite the name, gets user's access token
const refreshTokenAtom = atomWithMutation(() => ({
  mutationKey: ["refresh-token"],
  async mutationFn() {
    const token = await API.invoke("accessTokenGetRefreshToken");
    if (!token.$meta.ok) {
      throw new Error(token.error);
    }
    return token.token;
  },
}));

const revokeTokenAtom = atomWithMutation((get) => {
  const queryClient = get(queryClientAtom);
  return {
    mutationKey: ["revoke"],
    async mutationFn({ token }: { token: string }) {
      await API.invoke("accessTokenRevoke", null, {
        params: {},
        body: {
          refresh: token,
        },
      });
    },
    async onMutate({ token }: { token: string }) {
      console.log(token);
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ACCESS_TOKENS_QUERY_KEY });

      // Snapshot the previous value
      const previousTokens = queryClient.getQueryData(ACCESS_TOKENS_QUERY_KEY) as Token[];
      const filtered = previousTokens.filter((t) => t.token !== token);
      // Optimistically update to the new value
      queryClient.setQueryData(ACCESS_TOKENS_QUERY_KEY, (old: Token[]) => filtered as Token[]);

      // Return a context object with the snapshotted value
      return { previousTokens };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(ACCESS_TOKENS_QUERY_KEY, context?.previousTokens);
    },
    onSettled() {
      queryClient.invalidateQueries({
        queryKey: ACCESS_TOKENS_QUERY_KEY,
      });
    },
  };
});

export function PersonalJWTToken() {
  const [dialogOpened, setDialogOpened] = useState(false);
  const tokens = useAtomValue(tokensListAtom);
  const revokeToken = useAtomValue(revokeTokenAtom);

  const tokensListClassName = clsx({
    [styles.tokensList]: tokens.data && tokens.data.length,
  });

  const revoke = useCallback(
    async (token: string) => {
      await revokeToken.mutateAsync({ token });
    },
    [revokeToken],
  );

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
              {tokens.data?.map((token, index) => {
                return (
                  <div key={`${token.expires_at}${index}`} className="flex justify-between items-center">
                    <div>
                      {token.expires_at
                        ? format(new Date(token.expires_at), "MMM dd, yyyy HH:mm")
                        : "Personal access token"}
                    </div>
                    <Button look="destructive" onClick={() => revoke(token.token)}>
                      Revoke
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tokens.isError ? (
          <div>Unable to load tokens list</div>
        ) : null}
      </div>
      {/* <Button disabled={tokens.isLoading || (tokens.data?.length ?? 0) > 0} onClick={openDialog}> */}
      <Button onClick={openDialog}>Create New Token</Button>
    </div>
  );
}

function CreateTokenForm() {
  const { data: tokens } = useAtomValue(tokensListAtom);
  const { data, mutate } = useAtomValue(refreshTokenAtom);

  useEffect(() => {
    if (!tokens) return;
    mutate();
  }, [data]);

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

      {data?.expires_at && (
        <div>
          <Label text="Token Expiry Date" />
          {data && format(new Date(data?.expires_at), "MMM dd, yyyy HH:mm z")}
        </div>
      )}

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
