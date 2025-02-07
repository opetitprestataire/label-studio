import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@humansignal/ui/lib/card-new/card";
import { useMemo } from "react";
import { Redirect } from "react-router-dom";
import styles from "./AccountSettings.module.scss";
import { accountSettingsSections } from "./sections";
import { SidebarMenu } from "/apps/labelstudio/src/components/SidebarMenu/SidebarMenu";

export const AccountSettingsPage = () => {
  const menuItems = useMemo(
    () =>
      accountSettingsSections.map(({ title, id }) => ({
        title,
        path: () => {
          if (!window?.location) return;
          window.location.hash = `#${id}`;
        },
      })),
    [accountSettingsSections],
  );

  return (
    <div className={styles.accountSettings}>
      <SidebarMenu menuItems={menuItems} path={AccountSettingsPage.path}>
        <div className={styles.accountSettings__content}>
          {accountSettingsSections?.map(({ title, component: Section, description: Description, id }) => (
            <Card key={id}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                {Description && (
                  <CardDescription>
                    <Description />
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Section />
              </CardContent>
            </Card>
          ))}
        </div>
      </SidebarMenu>
    </div>
  );
};

AccountSettingsPage.title = "My Account";
AccountSettingsPage.path = "/user/account";
AccountSettingsPage.exact = true;
AccountSettingsPage.routes = () => [
  {
    title: () => "My Account",
    exact: true,
    component: () => {
      return <Redirect to={AccountSettingsPage.path} />;
    },
    // pages: {
    //   DataManagerPage,
    //   SettingsPage,
    // },
  },
];
