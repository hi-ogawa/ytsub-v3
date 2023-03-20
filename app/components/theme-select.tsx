import { tinyassert } from "@hiogawa/utils";
import React from "react";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/eb3a4cfe1474bc4236c5d4007c1e9f962eaa4df5/packages/app/src/components/theme-select-button.tsx

const THEME_OPTIONS = [
  ["system", "Use system theme"],
  ["dark", "Dark theme"],
  ["light", "Light theme"],
] as const;

export function ThemeSelect() {
  const [theme, setTheme] = useThemeState();
  return (
    <label className="flex items-center gap-2">
      Theme
      <select
        className="antd-input px-1"
        value={theme}
        onChange={(e) => {
          setTheme(e.target.value);
        }}
      >
        {THEME_OPTIONS.map(([t]) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

// defined in <head><script>
declare let __themeStorageKey: string;

function useThemeState() {
  const [theme, setTheme] = useLocalStorage(__themeStorageKey, "system");
  const prefersDark = useMatchMedia("(prefers-color-scheme: dark)");

  const isDark =
    theme === "dark" || (theme === "system" && prefersDark.matches);

  React.useEffect(() => {
    runWithoutTransition(() => {
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(isDark ? "dark" : "light");
    });
  }, [isDark]);

  return [theme, setTheme] as const;
}

function useLocalStorage(key: string, defaultValue: string) {
  const rerender = useRerender();

  function get() {
    return window.localStorage.getItem(key) || defaultValue;
  }

  function set(theme: string) {
    window.localStorage.setItem(key, theme);
    rerender();
  }

  return [get(), set] as const;
}

// TODO: utils-browser?
function runWithoutTransition(callback: () => void) {
  const el = document.createElement("style");
  el.innerHTML = `
    * {
      -webkit-transition: none !important;
      -moz-transition: none !important;
      -o-transition: none !important;
      -ms-transition: none !important;
      transition: none !important;
    }
  `;
  document.head.appendChild(el);
  callback();
  // force paint
  tinyassert(window.getComputedStyle(document.documentElement).transition);
  document.head.removeChild(el);
}

// TODO: utils-react?
function useMatchMedia(query: string) {
  const result = React.useMemo(() => window.matchMedia(query), [query]);
  const rerender = useRerender();

  React.useEffect(() => {
    result.addEventListener("change", rerender);
    return () => result.removeEventListener("change", rerender);
  }, [result]);

  return result;
}

function useRerender() {
  return React.useReducer((prev) => !prev, false)[1];
}
