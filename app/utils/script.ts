import { memoize } from "lodash";

export const loadScriptMemoized = memoize(loadScript);

export function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.addEventListener("load", () => resolve());
    el.addEventListener("error", reject);
    document.body.appendChild(el);
  });
}
