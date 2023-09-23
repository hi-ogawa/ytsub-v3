import { PreactToastManager } from "@hiogawa/tiny-toast/dist/preact";
import React from "react";

export const toast = new PreactToastManager();
toast.defaultOptions.class = "!antd-floating";

export function ToastWrapper(props: React.PropsWithChildren) {
  React.useEffect(() => {
    return toast.render(
      document.body.appendChild(document.createElement("div"))
    );
  }, []);

  return <>{props.children}</>;
}
