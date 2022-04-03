import { useMatches } from "@remix-run/react";
import * as React from "react";
import superjson from "superjson";
import { UserTable } from "../db/models";
import { FlashMessage } from "./session-utils";

export interface RootLoaderData {
  currentUser?: UserTable;
  flashMessages: FlashMessage[];
}

export function useRootLoaderData(): RootLoaderData {
  const [{ data }] = useMatches();
  return React.useMemo(() => superjson.deserialize(data as any), [data]);
}
