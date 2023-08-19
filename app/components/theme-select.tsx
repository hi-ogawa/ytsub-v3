import { getTheme, setTheme } from "@hiogawa/theme-script";
import { capitalize } from "@hiogawa/utils";
import React from "react";
import { SelectWrapper } from "./misc";

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
        value={getTheme()}
        labelFn={(v) => capitalize(v)}
        onChange={(selected) => {
          setTheme(selected);
          rerender();
        }}
      />
    </label>
  );
}
