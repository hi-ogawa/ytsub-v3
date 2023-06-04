import { capitalize } from "@hiogawa/utils";
import React from "react";
import { useMatchMedia } from "../utils/hooks-client-utils";
import { SelectWrapper } from "./misc";

// by @hiogawa/utils-experimental/dist/theme-script.global.js
declare let __themeSet: (theme: string) => void;
declare let __themeGet: () => string;

const THEME_OPTIONS = ["system", "dark", "light"];

// TODO: client only
export function ThemeSelect() {
  const [, rerender] = React.useReducer((prev) => !prev, false);

  return (
    <label className="flex items-center gap-2">
      Theme
      <SelectWrapper
        className="antd-input p-1"
        options={THEME_OPTIONS}
        value={__themeGet()}
        labelFn={(v) => capitalize(v)}
        onChange={(selected) => {
          __themeSet(selected);
          rerender();
        }}
      />
    </label>
  );
}

export function injectThemeScript() {
  return `\
globalThis.__themeStorageKey = "ytsub:theme";
${require("@hiogawa/utils-experimental/dist/theme-script.global.js?loader=text")}
`;
}

// update favicon based on system color scheme regardless of app's theme in order to have a proper contrast in the browser tab list.
export function ThemeLinkRelIcon() {
  const matches = useMatchMedia("(prefers-color-scheme: dark)");

  return (
    <link
      rel="icon"
      type="image/svg+xml"
      href={matches ? "/icon-dark.svg" : "/icon.svg"}
    />
  );
}
