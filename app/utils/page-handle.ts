import { useMatches } from "@remix-run/react";

export interface PageHandle {
  navBarTitle?: string;
  NavBarMenuComponent?: React.FC;
}

export type Match = Omit<ReturnType<typeof useMatches>[number], "handle"> & {
  handle: PageHandle;
};
