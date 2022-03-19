import * as React from "react";

export const VARIANTS = [
  "default",
  "info",
  "success",
  "warning",
  "error",
] as const;

export type Variant = typeof VARIANTS[number];

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

export function useSnackbar(): SnackbarContext {
  const value = React.useContext(DefaultSnackbarContext);
  if (!value) throw new Error("SnackbarContext undefined");
  return value;
}
