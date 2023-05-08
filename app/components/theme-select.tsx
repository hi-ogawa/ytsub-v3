import { capitalize } from "@hiogawa/utils";
import React from "react";
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
