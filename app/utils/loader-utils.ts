import {
  ShouldRevalidateFunction,
  useLoaderData,
  useMatches,
  useSearchParams,
} from "@remix-run/react";
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

export const disableUrlQueryRevalidation: ShouldRevalidateFunction = (args) => {
  if (args.nextUrl.pathname === args.currentUrl.pathname) {
    return false;
  }
  return args.defaultShouldRevalidate;
};

// Record<string, unknown> based wrapper for useSearchParams
export function useUrlQuery() {
  const [params, setParams] = useSearchParams();

  const query = Object.fromEntries(params.entries());

  const toParams = (newQuery: Record<string, unknown>) => {
    const prev = { ...query };
    for (const [k, v] of Object.entries(newQuery)) {
      if (typeof v === "undefined") {
        delete prev[k];
      } else {
        prev[k] = String(v);
      }
    }
    return new URLSearchParams(prev);
  };

  const setQuery = (newQuery: Record<string, unknown>) => {
    setParams(toParams(newQuery));
  };

  return [query, setQuery, toParams] as const;
}
