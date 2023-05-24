import { useSearchParams } from "@remix-run/react";
import type { Session } from "@remix-run/server-runtime";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { splitFirst } from "./misc";
import { useEffectNoStrict } from "./misc-react";
import { toastInfo } from "./toast-utils";

// simple trick to show flash messages on redirection

const KEY = "flash-messages";

const MSG_KEY = "__msg";

const Z_FLASH_MESSAGE = z.object({
  variant: z.enum(["success", "error", "info"]),
  content: z.string(),
});

export type FlashMessage = z.infer<typeof Z_FLASH_MESSAGE>;

export function pushFlashMessage(
  session: Session,
  flashMessage: FlashMessage
): void {
  const current = getFlashMessages(session);
  session.flash(KEY, [...current, flashMessage]);
}

export function getFlashMessages(session: Session): FlashMessage[] {
  return session.get(KEY) ?? [];
}

export function encodeFlashMessage(data: FlashMessage): URLSearchParams {
  const value = [data.variant, data.content].join("-");
  return new URLSearchParams([[MSG_KEY, value]]);
}

export function decodeFlashMessage(
  params: URLSearchParams
): FlashMessage | undefined {
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

      // remix does redundant refetch but not a big deal (if we were too delicate, we could tweak shouldRevalidate)
      const newParams = new URLSearchParams(params);
      newParams.delete(MSG_KEY);
      setParams(newParams, { replace: true });

      // sneakily mutate url history so that remix won't refetch
      // (TODO: probably it will break some remix's internal invariant. if this causes issue, we can just refetch or maybe tweak shouldRevalidate with legitimate client navigation.)
      // const url = new URL(window.location.href);
      // url.searchParams.delete(MSG_KEY);
      // window.history.replaceState(window.history.state, "", url);
    }
  }, [params]);
}
