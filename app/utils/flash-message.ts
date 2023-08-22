import { wrapError } from "@hiogawa/utils";
import { useNavigation, useSearchParams } from "@remix-run/react";
import * as cookieLib from "cookie";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { STATE_NO_PROGRESS_BAR } from "../components/top-progress-bar";
import { splitFirst } from "./misc";
import { useEffectNoStrict } from "./misc-react";
import { toastInfo } from "./toast-utils";

// simple trick to show flash messages on redirection

const MSG_KEY = "__msg";

const Z_FLASH_MESSAGE = z.object({
  variant: z.enum(["success", "error", "info"]),
  content: z.string(),
});

export type FlashMessage = z.infer<typeof Z_FLASH_MESSAGE>;

export function encodeFlashMessage(data: FlashMessage): URLSearchParams {
  const value = [data.variant, data.content].join("-");
  return new URLSearchParams([[MSG_KEY, value]]);
}

function decodeFlashMessage(params: URLSearchParams): FlashMessage | undefined {
  const value = params.get(MSG_KEY);
  if (value) {
    const [variant, content] = splitFirst(value, "-");
    const parsed = Z_FLASH_MESSAGE.safeParse({ variant, content });
    if (parsed.success) {
      return parsed.data;
    }
  }
  return;
}

export function useFlashMessageHandler() {
  const [params, setParams] = useSearchParams();

  useEffectNoStrict(() => {
    if (true as boolean) {
      return;
    }

    const flashMessage = decodeFlashMessage(params);
    if (flashMessage) {
      const { variant, content } = flashMessage;
      switch (variant) {
        case "success": {
          toast.success(content);
          break;
        }
        case "error": {
          toast.error(content);
          break;
        }
        case "info": {
          toastInfo(content);
          break;
        }
      }

      // remix might refetch redundantly (we can tweak shouldRevalidate if we need want to avoid that)
      const newParams = new URLSearchParams(params);
      newParams.delete(MSG_KEY);
      setParams(newParams, { replace: true, state: STATE_NO_PROGRESS_BAR });
    }
  }, [params]);

  const navigation = useNavigation();
  useEffectNoStrict(() => {
    handleFlashMessage();
  }, [navigation.state]);
}

//
// js cookie based flash message
// https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#example_3_do_something_only_once
//

const COOKIE_NAME = "__flash";

export function setFlashMessage(v: FlashMessage) {
  document.cookie = serializeFlashMessageCookie(JSON.stringify(v));
}

export function handleFlashMessage() {
  const cookies = cookieLib.parse(document.cookie);
  const value = cookies[COOKIE_NAME];
  if (!value) {
    return;
  }
  const parsed = wrapError(() => Z_FLASH_MESSAGE.parse(JSON.parse(value)));
  if (!parsed.ok) {
    console.error(parsed.value);
    return;
  }

  // make it empty so that it will be handled only once
  document.cookie = serializeFlashMessageCookie("");

  // show toast
  const { variant, content } = parsed.value;
  switch (variant) {
    case "success": {
      toast.success(content);
      break;
    }
    case "error": {
      toast.error(content);
      break;
    }
    case "info": {
      toastInfo(content);
      break;
    }
  }
}

export function serializeFlashMessageCookie(v: string) {
  return cookieLib.serialize(COOKIE_NAME, v, {
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}
