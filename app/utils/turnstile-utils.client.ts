import { newPromiseWithResolvers } from "@hiogawa/utils";
import { loadScript } from "./dom-utils";

// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

export let turnstile: {
  ready: (f: () => void) => void;
  render: (
    el: HTMLElement,
    params: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback": (error: unknown) => void;
    }
  ) => string | undefined;
};

export async function loadTurnstileScript() {
  const { promise, resolve } = newPromiseWithResolvers<void>();
  const CALLBACK_VAR = "__onloadTurnstileCallback";
  const windowAny = window as any;
  windowAny[CALLBACK_VAR] = () => {
    turnstile = windowAny.turnstile;
    resolve();
  };
  await loadScript(
    `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=${CALLBACK_VAR}`
  );
  await promise;
}
