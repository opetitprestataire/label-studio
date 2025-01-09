import { Description } from "apps/labelstudio/src/components/Description/Description";
import { Block } from "apps/labelstudio/src/components/Menu/MenuContext";
import { Input } from "../../../components/Form";
import { useCallback, useState } from "react";
import { copyText } from "apps/labelstudio/src/utils/helpers";
import { Space } from "apps/labelstudio/src/components/Space/Space";
import { Button } from "libs/datamanager/src/components/Common/Button/Button";

function InviteLink() {
  const inviteModalProps = useCallback(
    (link: string) => ({
      title: "Invite people",
      style: { width: 640, height: 472 },
      body: () => <InvitationModal link={link} />,
      footer: () => {
        const [copied, setCopied] = useState(false);

        const copyLink = useCallback(() => {
          setCopied(true);
          copyText(link);
          setTimeout(() => setCopied(false), 1500);
          __lsa("organization.add_people.copy_link");
        }, []);

        return (
          <Space spread>
            <Space>
              <Button style={{ width: 170 }} onClick={() => updateLink()}>
                Reset Link
              </Button>
            </Space>
            <Space>
              <Button primary style={{ width: 170 }} onClick={copyLink}>
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </Space>
          </Space>
        );
      },
      bareFooter: true,
    }),
    [],
  );
  return null
}

const InvitationModal = ({ link }) => {
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
