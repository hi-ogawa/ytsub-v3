import { useMatches } from "@remix-run/react";
import type { UserTable } from "../db/models";
import type { PUBLIC } from "../misc/env.server";
import type { FlashMessage } from "./flash-message";
import { useDeserialize } from "./hooks";

export interface RootLoaderData {
  currentUser?: UserTable;
  flashMessages: FlashMessage[];
  PUBLIC: typeof PUBLIC;
}

export function useRootLoaderData(): RootLoaderData {
  const [{ data }] = useMatches();
  return useDeserialize(data);
}

export function useLeafLoaderData(): any {
  const [{ data }] = useMatches().slice(-1);
  return data;
}
