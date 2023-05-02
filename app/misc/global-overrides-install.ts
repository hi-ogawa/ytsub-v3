import { Debug } from "@hiogawa/utils-react";

export function globalOverridesInstall() {
  Object.assign(globalThis, { Debug });
}
