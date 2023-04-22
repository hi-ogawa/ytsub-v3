import { newPromiseWithResolvers } from "@hiogawa/utils";

export async function loadScript(src: string): Promise<void> {
  const { promise, resolve, reject } = newPromiseWithResolvers<void>();
  const el = document.createElement("script");
  el.src = src;
  el.async = true;
  el.addEventListener("load", () => resolve());
  el.addEventListener("error", reject);
  document.body.appendChild(el);
  await promise;
}
