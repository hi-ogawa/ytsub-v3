import { useMatches } from "@remix-run/react";
import type { UserTable } from "../db/models";
import type { FlashMessage } from "./flash-message";
import { useDeserialize } from "./hooks";
import { makeLoaderImpl } from "./loader-utils.server";

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

// hide server only HOR (higher order function) on client budnle.
// the same could be achieved by magic "PURE" comment on caller side.
export const makeLoaderV2 = (
  typeof window === "undefined" ? makeLoaderImpl : () => {}
) as typeof makeLoaderImpl;
