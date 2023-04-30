import { useLoaderData, useMatches } from "@remix-run/react";
import React from "react";
import { deserialize } from "superjson";
import type { UserTable } from "../db/models";
import type { FlashMessage } from "./flash-message";
import { makeLoaderImpl } from "./loader-utils.server";

export interface RootLoaderData {
  currentUser?: UserTable;
  flashMessages: FlashMessage[];
}

export function useRootLoaderData(): RootLoaderData {
  const [{ data }] = useMatches();
  return React.useMemo(() => deserialize(data), [data]);
}

export function useDeLeafLoaderData(): unknown {
  const [{ data }] = useMatches().slice(-1);
  return React.useMemo(() => deserialize(data), [data]);
}

// hide server only HOR (higher order function) on client budnle.
// the same could be achieved by magic "PURE" comment on caller side.
// TODO: but unless we do explicit `PURE`, then esbuild cannot tree-shake inner loader function?
export const makeLoader = (
  typeof window === "undefined" ||
  (typeof process !== "undefined" && process.env["VITEST"])
    ? makeLoaderImpl
    : () => {}
) as typeof makeLoaderImpl;

// companion for makeLoader with auto superjson.serialize
export function useDeLoaderData(): unknown {
  const data = useLoaderData();
  return React.useMemo(() => deserialize(data), [data]);
}
