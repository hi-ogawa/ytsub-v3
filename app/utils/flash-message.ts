import { Session } from "@remix-run/server-runtime";
import { Variant } from "../components/snackbar";

const KEY = "flash-messages";

export interface FlashMessage {
  content: string;
  variant?: Variant;
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
