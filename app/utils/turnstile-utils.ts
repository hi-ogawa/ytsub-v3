import { newPromiseWithResolvers, once, tinyassert } from "@hiogawa/utils";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { publicConfig } from "./config-public";
import { loadScript } from "./dom-utils";
import { usePromiseQueryOpitons } from "./misc";

// https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/

interface TurnstileApi {
  render: (
    el: HTMLElement,
    params: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback": (error: unknown) => void;
    }
  ) => string | undefined;
}

async function loadTurnstileScript() {
  const { promise, resolve } = newPromiseWithResolvers<TurnstileApi>();
  const CALLBACK_VAR = "__onloadTurnstileCallback";
  (window as any)[CALLBACK_VAR] = () => {
    resolve((window as any).turnstile);
  };
  await loadScript(
    `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=${CALLBACK_VAR}`
  );
  return promise;
}

const loadTurnstileScriptOnce = once(loadTurnstileScript);

export function useTurnstile() {
  const query = useQuery({
    ...usePromiseQueryOpitons(loadTurnstileScriptOnce),
  });

  const ref = React.useRef<HTMLDivElement>(null);

  function render(): Promise<string> {
    tinyassert(query.isSuccess);
    tinyassert(ref.current);
    const turnstile = query.data;
    const el = ref.current;
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

  return {
    query,
    ref,
    render,
  };
}
