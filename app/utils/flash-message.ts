import type { Session } from "@remix-run/server-runtime";

// TODO: refactor

const KEY = "flash-messages";

export interface FlashMessage {
  content: string;
  variant?: "success" | "error" | "info";
}

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
