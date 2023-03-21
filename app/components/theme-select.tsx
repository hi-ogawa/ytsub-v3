import React from "react";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/eb3a4cfe1474bc4236c5d4007c1e9f962eaa4df5/packages/app/src/components/theme-select-button.tsx

const THEME_OPTIONS = [
  ["system", "System"],
  ["dark", "Dark"],
  ["light", "Light"],
] as const;

// TODO: NoSSR
export function ThemeSelect() {
  const [theme, setTheme] = useTheme();
  return (
    <label className="flex items-center gap-2">
      Theme
      <select
        className="antd-input px-1 py-0.5"
        value={theme}
        onChange={(e) => {
          setTheme(e.target.value);
        }}
      >
        {THEME_OPTIONS.map(([t, label]) => (
          <option key={t} value={t}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
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
