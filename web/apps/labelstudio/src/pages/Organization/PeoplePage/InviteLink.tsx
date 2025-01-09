import { Description } from "apps/labelstudio/src/components/Description/Description";
import { Block } from "apps/labelstudio/src/components/Menu/MenuContext";
import { Input } from "../../../components/Form";
import { useCallback, useEffect, useRef, useState } from "react";
import { copyText } from "apps/labelstudio/src/utils/helpers";
import { Space } from "@humansignal/ui";
import { Button } from "@humansignal/ui/shad/components/ui/button";
import { API } from "apps/labelstudio/src/providers/ApiProvider";
import { atomWithQuery } from "jotai-tanstack-query";
import { useAtomValue } from "jotai";
import { Modal } from "apps/labelstudio/src/components/Modal/ModalPopup";

const linkAtom = atomWithQuery(() => ({
  queryKey: ["invite-link"],
  async queryFn() {
    const result = await API.resetInviteLink();
    return location.origin + result.invite_url;
  },
}));

export function InviteLink({
  opened,
  onOpened,
  onClosed,
}: {
  opened: boolean;
  onOpened?: () => void;
  onClosed?: () => void;
}) {
  const modalRef = useRef();
  useEffect(() => {
    if (opened) {
      modalRef.current?.show?.();
    } else {
      modalRef.current?.hide?.();
    }
  }, [opened]);

  return (
    <Modal
      ref={modalRef}
      title="Invite people"
      opened={opened}
      bareFooter={true}
      body={<InvitationModal />}
      footer={<InvitationFooter />}
      style={{ width: 640, height: 472 }}
      onHide={onClosed}
      onShow={onOpened}
    />
  );
}

const InvitationModal = () => {
  const { data: link } = useAtomValue(linkAtom);
  return (
    <Block name="invite">
      <Input value={link} style={{ width: "100%" }} readOnly />

      <Description style={{ marginTop: 16 }}>
        Invite people to join your Label Studio instance. People that you invite have full access to all of your
        projects.{" "}
        <a
          href="https://labelstud.io/guide/signup.html"
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            __lsa("docs.organization.add_people.learn_more", { href: "https://labelstud.io/guide/signup.html" })
          }
        >
          Learn more
        </a>
        .
      </Description>
    </Block>
  );
};

const InvitationFooter = () => {
  const [copied, setCopied] = useState(false);
  const { refetch, data: link } = useAtomValue(linkAtom);
  console.log(link);

  const copyLink = useCallback(() => {
    setCopied(true);
    copyText(link ?? "");
    setTimeout(() => setCopied(false), 1500);
    __lsa("organization.add_people.copy_link");
  }, []);

  return (
    <Space spread>
      <Space>
        <Button variant="secondary" style={{ width: 170 }} onClick={() => refetch()}>
          Reset Link
        </Button>
      </Space>
      <Space>
        <Button style={{ width: 170 }} onClick={copyLink}>
          {copied ? "Copied!" : "Copy link"}
        </Button>
      </Space>
    </Space>
  );
};
