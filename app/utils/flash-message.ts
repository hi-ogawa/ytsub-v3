import { useSearchParams } from "@remix-run/react";
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

type FlashMessage = z.infer<typeof Z_FLASH_MESSAGE>;

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
}
