import {
  ShouldRevalidateFunction,
  useLoaderData,
  useMatches,
  useSearchParams,
} from "@remix-run/react";
import React from "react";
import { deserialize } from "superjson";
import type { z } from "zod";
import type { UserTable } from "../db/models";

export interface RootLoaderData {
  currentUser?: UserTable;
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

  const query = React.useMemo(
    () => Object.fromEntries(params.entries()),
    [params]
  );

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

export function useTypedUrlQuery<S extends z.AnyZodObject>(schema: S) {
  const [query, setQuery, toParams] = useUrlQuery();

  type In = z.input<S>;
  type Out = z.output<S>;

  const parsed = React.useMemo(() => schema.safeParse(query), [query]);
  const typedQuery: Out | undefined = parsed.success ? parsed.data : undefined;

  const setTypedQuery = (newTypedQuery: In) => {
    setQuery(newTypedQuery);
  };

  const toTypedParams = (newTypedQuery: In) => {
    return toParams(newTypedQuery);
  };

  return [typedQuery, setTypedQuery, toTypedParams] as const;
}

export function prettierJson(data: unknown) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
