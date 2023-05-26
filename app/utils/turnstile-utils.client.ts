import { newPromiseWithResolvers } from "@hiogawa/utils";
import { publicConfig } from "./config-public";
import { loadScript } from "./dom-utils";

// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

let turnstile: {
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

export function turnstileRenderPromise(el: HTMLElement): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    turnstile.render(el, {
      sitekey: publicConfig.APP_CAPTCHA_SITE_KEY,
      callback: (token) => {
        resolve(token);
      },
      "error-callback": (error) => {
        reject(error);
      },
    });
  });
}
