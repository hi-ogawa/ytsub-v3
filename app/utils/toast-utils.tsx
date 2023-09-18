import {
  ReactToastContainer,
  ReactToastManager,
} from "@hiogawa/tiny-toast/dist/react";
import React from "react";
import { Toaster } from "react-hot-toast";

export function ToastWrapper(props: React.PropsWithChildren) {
  return (
    <>
      <Toaster
        toastOptions={{
          className: "!bg-colorBgElevated !text-colorText",
        }}
      />
      <ReactToastContainer toast={toast2} />
      {props.children}
    </>
  );
}

// wrapper to imitate react-hot-toast api
// TODO: implement in tiny-toast
class CustomReactToastManager extends ReactToastManager {
  success = (node: React.ReactNode) =>
    this.create({
      node,
      type: "success",
      ...baseOptions,
    });

  error = (node: React.ReactNode) =>
    this.create({
      node,
      type: "error",
      ...baseOptions,
    });

  info = (node: React.ReactNode) =>
    this.create({
      node,
      type: "info",
      ...baseOptions,
    });
}

const baseOptions = {
  position: "top-center",
  className: "!antd-floating",
} as const;

export const toast2 = new CustomReactToastManager();
