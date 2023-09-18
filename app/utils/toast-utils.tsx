import {
  ReactToastContainer,
  ReactToastManager,
} from "@hiogawa/tiny-toast/dist/react";
import React from "react";
import { Toaster, toast } from "react-hot-toast";

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

export function toastInfo(...args: Parameters<typeof toast>) {
  args[1] ??= {};
  args[1].icon = <span className="i-ri-information-line w-5 h-5"></span>;
  toast(...args);
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
