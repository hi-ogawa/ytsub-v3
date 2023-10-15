import { TinyReactToastManager } from "@hiogawa/tiny-toast";
import React from "react";

export const toast = new TinyReactToastManager();
toast.defaultOptions.className = "!antd-floating";

export function ToastWrapper(props: React.PropsWithChildren) {
  React.useEffect(() => toast.render(), []);
  return <>{props.children}</>;
}
