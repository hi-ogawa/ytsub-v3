import { useLoaderData, useMatches } from "@remix-run/react";
import React from "react";
import { deserialize } from "superjson";
import type { UserTable } from "../db/models";
import type { FlashMessage } from "./flash-message";

export interface RootLoaderData {
  currentUser?: UserTable;
  flashMessages: FlashMessage[];
}

export function useRootLoaderData(): RootLoaderData {
  const [{ data }] = useMatches();
  return React.useMemo(() => deserialize(data), [data]);
}

export function useLeafLoaderData(): unknown {
  const [{ data }] = useMatches().slice(-1);
  return React.useMemo(() => deserialize(data), [data]);
}

// superjson.deserialize wrapper
export function useLoaderDataExtra(): unknown {
  const data = useLoaderData();
  return React.useMemo(() => deserialize(data), [data]);
}
