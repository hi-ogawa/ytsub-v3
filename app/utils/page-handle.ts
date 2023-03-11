import type { useMatches } from "@remix-run/react";
import type React from "react";

export interface PageHandle {
  navBarTitle?: () => React.ReactNode;
  navBarMenu?: () => React.ReactNode;
}

export type Match = Omit<ReturnType<typeof useMatches>[number], "handle"> & {
  handle: PageHandle;
};
