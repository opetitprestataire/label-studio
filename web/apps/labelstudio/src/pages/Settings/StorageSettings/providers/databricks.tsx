import { EnterpriseBadge } from "@humansignal/ui";
import { Alert, AlertTitle, AlertDescription } from "@humansignal/shad/components/ui/alert";
import { IconCloudProviderDatabricks } from "@humansignal/icons";
import type { ProviderConfig } from "@humansignal/app-common/blocks/StorageProviderForm/types/provider";

const databricksProvider: ProviderConfig = {
  name: "databricks",
  title: "Databricks Files\n(UC Volumes)",
  description: "Configure your Databricks Unity Catalog Volumes connection with all required settings (proxy only)",
  icon: IconCloudProviderDatabricks,
  disabled: true,
  badge: <EnterpriseBadge />,
  fields: [
    {
      name: "enterprise_info",
      type: "message",
      content: (
        <Alert variant="destructive">
          <AlertTitle>
            <div className="flex items-center gap-2">
              Databricks Files (UC Volumes)
              <EnterpriseBadge />
            </div>
          </AlertTitle>
          <AlertDescription>
            Databricks connectivity is available in Label Studio Enterprise.{" "}
            <a
              href="https://humansignal.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Learn more
            </a>
          </AlertDescription>
        </Alert>
      ),
    },
  ],
  layout: [{ fields: ["enterprise_info"] }],
};

export default databricksProvider;
