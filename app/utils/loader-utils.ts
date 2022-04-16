import { useMatches } from "@remix-run/react";
import { UserTable } from "../db/models";
import { FlashMessage } from "./flash-message";
import { useDeserialize } from "./hooks";

export interface RootLoaderData {
  currentUser?: UserTable;
  flashMessages: FlashMessage[];
}

export function useRootLoaderData(): RootLoaderData {
  const [{ data }] = useMatches();
  return useDeserialize(data);
}

export function useLeafLoaderData(): any {
  const [{ data }] = useMatches().slice(-1);
  return data;
}
