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
      <ReactToastContainer toast={toastManager} />
      {props.children}
    </>
  );
}

export function toastInfo(...args: Parameters<typeof toast>) {
  args[1] ??= {};
  args[1].icon = <span className="i-ri-information-line w-5 h-5"></span>;
  toast(...args);
}

const toastManager = new ReactToastManager();

// wrapper to imitate react-hot-toast api
export const toast2 = {
  success: (node: React.ReactNode) =>
    toastManager.create({
      node,
      type: "success",
      ...baseOptions,
    }),
  error: (node: React.ReactNode) =>
    toastManager.create({
      node,
      type: "error",
      ...baseOptions,
    }),
  info: (node: React.ReactNode) =>
    toastManager.create({
      node,
      type: "info",
      ...baseOptions,
    }),
};

const baseOptions = {
  position: "top-center",
  duration: 4000,
  className: "!antd-floating !text-colorText",
} as const;
