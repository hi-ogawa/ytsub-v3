import React from "react";
import { toast } from "react-hot-toast";

export const VARIANTS = [
  "default",
  "info",
  "success",
  "warning",
  "error",
] as const;

export type Variant = (typeof VARIANTS)[number];

export interface SnackbarItemProps {
  id: string;
  variant: Variant;
}

export interface SnackbarItem extends SnackbarItemProps {
  node: React.ReactNode;
  state: "show" | "slide-out" | "collapse";
}

export interface SnackbarProviderProps {
  components: {
    Container: React.ComponentType<React.PropsWithChildren<{}>>;
    Item: React.ComponentType<React.PropsWithChildren<SnackbarItemProps>>;
  };
  timeout: number;
}

export interface SnackbarOptions {
  variant?: Variant;
}

export interface SnackbarContext {
  enqueueSnackbar: (node: React.ReactNode, options?: SnackbarOptions) => string;
  closeSnackbar: (id: string) => void;
}

export const DefaultSnackbarContext = React.createContext<
  SnackbarContext | undefined
>(undefined);

// TODO: replace with direct `toast` calls
export function useSnackbar(): SnackbarContext {
  if (true as boolean) {
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
      closeSnackbar: (id) => {
        toast.dismiss(id);
      },
    };
  }

  const value = React.useContext(DefaultSnackbarContext);
  if (!value) throw new Error("SnackbarContext undefined");
  return value;
}
