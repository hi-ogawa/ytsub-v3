import React from "react";
import { SelectWrapper } from "./misc";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/eb3a4cfe1474bc4236c5d4007c1e9f962eaa4df5/packages/app/src/components/theme-select-button.tsx

const THEME_OPTIONS = ["system", "dark", "light"];

// TODO: client only
export function ThemeSelect() {
  const [theme, setTheme] = useTheme();
  return (
    <label className="flex items-center gap-2">
      Theme
      <SelectWrapper
        className="antd-input p-1"
        options={THEME_OPTIONS}
        value={theme}
        labelFn={(v) => capitalize(v)}
        onChange={(selected) => setTheme(selected)}
      />
    </label>
  );
}

function capitalize(s: string) {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

//
// defined in <head><script> (see index.html)
//

declare let __theme: {
  setTheme: (theme: string) => void;
  getTheme: () => string;
};

function useTheme() {
  const [theme, setTheme] = React.useState(() => __theme.getTheme());

  function setThemeWrapper(config: string) {
    __theme.setTheme(config);
    setTheme(config);
  }

  return [theme, setThemeWrapper] as const;
}
