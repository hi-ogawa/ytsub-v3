import { ctx_get } from "../server/request-context/storage";
import { FlashMessage, serializeFlashMessageCookie } from "./flash-message";

// context helper for js-cookie based flash message
export async function ctx_setFlashMessage(v: FlashMessage) {
  const ctx = ctx_get();
  const setCookie = serializeFlashMessageCookie(JSON.stringify(v));
  ctx.responseHeaders.append("set-cookie", setCookie);
}
