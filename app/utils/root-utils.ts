import { useMatches } from "@remix-run/react";
import * as React from "react";
import { UserTable } from "../db/models";
import { deserialize } from "./controller-utils";
import { FlashMessage } from "./session-utils";

export interface RootLoaderData {
  currentUser?: UserTable;
  flashMessages: FlashMessage[];
}

export function useRootLoaderData(): RootLoaderData {
  const [{ data }] = useMatches();
  return React.useMemo(() => deserialize(data as any), [data]);
}
