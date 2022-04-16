import { Session } from "@remix-run/server-runtime";
import { Variant } from "../components/snackbar";
import { getFlash, setFlash } from "./session-utils";

const KEY = "flash-messages";

export interface FlashMessage {
  content: string;
  variant?: Variant;
}

export function pushFlashMessage(
  session: Session,
  flashMessage: FlashMessage
): void {
  const current = getFlashMessages(session, "phase1");
  setFlash(session, KEY, [...current, flashMessage]);
}

export function getFlashMessages(
  session: Session,
  phase: "phase1" | "phase2" = "phase2"
): FlashMessage[] {
  return getFlash(session, KEY, phase) ?? [];
}
