import { wrapError } from "@hiogawa/utils";
import { useNavigation } from "@remix-run/react";
import * as cookieLib from "cookie";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { useEffectNoStrict } from "./misc-react";
import { toast2 } from "./toast-utils";

//
// js cookie based flash message
// https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#example_3_do_something_only_once
//

const COOKIE_NAME = "__flash";

const Z_FLASH_MESSAGE = z.object({
  variant: z.enum(["success", "error", "info"]),
  content: z.string(),
});

export type FlashMessage = z.infer<typeof Z_FLASH_MESSAGE>;

export function useFlashMessageHandler() {
  const navigation = useNavigation();
  useEffectNoStrict(() => {
    handleFlashMessage();
  }, [navigation.state]);
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
      toast2.success(content);
      break;
    }
    case "error": {
      toast2.error(content);
      break;
    }
    case "info": {
      toast2.info(content);
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
