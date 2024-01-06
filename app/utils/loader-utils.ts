import {
  ShouldRevalidateFunction,
  useLoaderData,
  useMatches,
  useSearchParams,
} from "@remix-run/react";
import React from "react";
import type { z } from "zod";
import { JSON_EXTRA } from "./json-extra";

export function useLeafLoaderData(): unknown {
  const [{ data }] = useMatches().slice(-1);
  return React.useMemo(() => JSON_EXTRA.deserialize(data), [data]);
}

// custom json serialization wrapper
export function useLoaderDataExtra(): unknown {
  const data = useLoaderData();
  return React.useMemo(() => JSON_EXTRA.deserialize(data), [data]);
}

export const disableUrlQueryRevalidation: ShouldRevalidateFunction = (args) => {
  if (args.nextUrl.pathname === args.currentUrl.pathname) {
    return false;
  }
  return args.defaultShouldRevalidate;
};

// Record<string, unknown> based wrapper for useSearchParams
function useUrlQuery() {
  // TODO: framework agnostic?
  const [params, setParams] = useSearchParams();

  const value = React.useMemo(
    () => Object.fromEntries(params.entries()),
    [params]
  );

  function set(
    next: Record<string, unknown>,
    opts?: { replace?: boolean }
  ): void {
    setParams(merge(next), opts);
  }

  function merge(next: Record<string, unknown>): URLSearchParams {
    const res = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || typeof v === "undefined") {
        res.delete(k);
      } else {
        res.set(k, String(v));
      }
    }
    return res;
  }

  return [value, set, merge] as const;
}

// type-safe helper for simple object record with "string | number | undefined | null".
// this assumes schema can parse {} and fill default
export function useUrlQuerySchema<Schame extends z.AnyZodObject>(
  schema: Schame
) {
  // TODO: validator-agnostic?
  type I = z.input<Schame>;
  type O = z.output<Schame>;

  const [query, setQuery, mergeParams] = useUrlQuery();

  const value: O = React.useMemo(() => {
    const result = schema.safeParse(query);
    return result.success ? result.data : schema.parse({});
  }, [query]);

  const set = (next: I, opts?: { replace?: boolean }) => setQuery(next, opts);

  const merge = (next: I) => mergeParams(next);

  return [value, set, merge] as const;
}

export function prettierJson(data: unknown) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
