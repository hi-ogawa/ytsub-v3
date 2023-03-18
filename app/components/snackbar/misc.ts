import React from "react";
import { toast } from "react-hot-toast";

const VARIANTS = ["default", "info", "success", "warning", "error"] as const;

export type Variant = (typeof VARIANTS)[number];

interface SnackbarOptions {
  variant?: Variant;
}

interface SnackbarContext {
  enqueueSnackbar: (node: React.ReactNode, options?: SnackbarOptions) => string;
}

// TODO: replace with direct `toast` calls
export function useSnackbar(): SnackbarContext {
  return {
    enqueueSnackbar: (node, options) => {
      const el = React.createElement(React.Fragment, {}, node);
      if (options?.variant === "success") {
        return toast.success(el);
      }
      if (options?.variant === "error") {
        return toast.error(el);
      }
      return toast(el);
    },
  };
}
