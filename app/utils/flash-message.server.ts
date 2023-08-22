import { ctx_get } from "../server/request-context/storage";
import { FlashMessage, serializeFlashMessageCookie } from "./flash-message";

// context helper for flash message on server

export async function ctx_setFlashMessage(v: FlashMessage) {
  const ctx = ctx_get();
  const setCookie = serializeFlashMessageCookie(JSON.stringify(v));
  ctx.responseHeaders.append("set-cookie", setCookie);
}
