import {
  ReactToastContainer,
  ReactToastManager,
} from "@hiogawa/tiny-toast/dist/react";
import React from "react";

export function ToastWrapper(props: React.PropsWithChildren) {
  return (
    <>
      <ReactToastContainer toast={toast} />
      {props.children}
    </>
  );
}

export const toast = new ReactToastManager();
toast.defaultOptions.className = "!antd-floating";
