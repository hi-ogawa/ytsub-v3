import { capitalize, tinyassert } from "@hiogawa/utils";
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

export function injectThemeScript(markup: string): string {
  // patch @remix/dev to use raw loader for ".html"
  const viteIndexHtml = require("../../index.html");
  tinyassert(typeof viteIndexHtml === "string");

  const themeScript = viteIndexHtml.match(/<script>(.*?)<\/script>/ms)?.[1];
  tinyassert(themeScript);

  return markup.replace(MARKER_ThemeScriptPlaceholder, themeScript);
}

export function ThemeScriptPlaceholder() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: MARKER_ThemeScriptPlaceholder }}
      suppressHydrationWarning
    />
  );
}

const MARKER_ThemeScriptPlaceholder = "@@__ThemeScriptPlaceholder@@";
