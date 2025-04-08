import React from "react";

import { useStorybookApi } from "@storybook/manager-api";
import { IconButton } from "@storybook/components";
import { MoonIcon, SunIcon } from "@storybook/icons";

import { ADDON_ID, TOOL_ID, THEMES, DEFAULT_THEME } from "./constants";
import { useAtom, useAtomValue } from "jotai/react";
import { evaluatedThemeAtom, themeAtom } from "./atoms";

export const ThemeTool = React.memo(function MyAddonSelector() {
  const [theme, setTheme] = useAtom(themeAtom);
  const evaluatedTheme = useAtomValue(evaluatedThemeAtom);
  const api = useStorybookApi();

  const toggleTheme = React.useCallback(() => {
    setTheme((previousTheme) => THEMES[(THEMES.indexOf(previousTheme) + 1) % THEMES.length]);
  }, []);

  React.useEffect(() => {
    api.setAddonShortcut(ADDON_ID, {
      label: "Toggle Theme [8]",
      defaultShortcut: ["8"],
      actionName: "toggleTheme",
      showInMenu: false,
      action: toggleTheme,
    });
  }, [toggleTheme, api]);

  return (
    <IconButton key={TOOL_ID} active={theme !== DEFAULT_THEME} title="Toggle theme" onClick={toggleTheme}>
      {evaluatedTheme === "dark" ? <MoonIcon /> : <SunIcon />}
    </IconButton>
  );
});
