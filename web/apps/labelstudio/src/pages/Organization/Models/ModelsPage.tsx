import type { Page } from "../../types/Page";
import { Space } from "@humansignal/ui";
import { Block } from "apps/labelstudio/src/utils/bem";
import { EmptyList } from "./@components/EmptyList";
import { Link } from "react-router-dom";
import { buttonVariant } from "@humansignal/ui";

export const ModelsPage: Page = () => {
  return (
    <Block name="prompter">
      <EmptyList />
    </Block>
  );
};

ModelsPage.title = () => "Models";
ModelsPage.titleRaw = "Models";
ModelsPage.path = "/models";

ModelsPage.context = () => {
  return (
    <Space size="small">
      <Link to="/prompt/settings" className={buttonVariant({ size: "small" })}>
        Create Model
      </Link>
    </Space>
  );
};
