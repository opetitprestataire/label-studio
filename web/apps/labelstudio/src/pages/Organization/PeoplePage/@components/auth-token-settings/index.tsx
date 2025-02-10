import { atomWithQuery } from "jotai-tanstack-query";
import { Input, Toggle } from "../../../../components/Form";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { useAtomValue } from "jotai";

const settingsAtom = atomWithQuery(() => ({
  queryKey: ["api-settings"],
  async queryFn() {
    const result = await API.invoke("accessTokenSettings");

    if (!result.$meta.ok) {
      throw new Error(result.error);
    }

    return result;
  },
}));

const TokenSettingsModal = () => {
  const settings = useAtomValue(settingsAtom);
  return (
    <div>
      <div>
        <Toggle label="Enable JWT API Token" />
      </div>
      <div>
        <Toggle label="Enable Legacy Token" />
      </div>
      <div>
        <Input label="Token TTL" />
      </div>
    </div>
  );
};
