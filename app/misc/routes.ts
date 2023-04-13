import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { createGetProxy } from "../utils/proxy-utiils";

// centralized route definitions to benefit from static analysis e.g.
// - prevent typo by type check
// - auto-completion
// - refactoring routes via "Rename symbol"
// - showing usage via "Find all references"

//
// type-safe route url definition
//

const Z_ID_PARAMS = z.object({
  id: z.coerce.number().int(),
});

const Z_PAGINATION_QUERY = z.object({
  page: z.coerce.number().int().optional().default(1),
  perPage: z.coerce.number().int().optional().default(20),
});

export const ROUTE_DEF = {
  "/": {},
  "/videos": {},
  "/videos/new": {
    query: z.object({
      videoId: z.string(),
    }),
  },
  "/videos/$id": {
    params: Z_ID_PARAMS,
    query: z.object({
      index: z.coerce.number().int().optional(),
    }),
  },
  "/bookmarks": {
    query: z
      .object({
        videoId: z.coerce.number().int().optional(),
        deckId: z.coerce.number().int().optional(),
        order: z.enum(["createdAt", "caption"]).default("createdAt"),
      })
      .merge(Z_PAGINATION_QUERY),
  },
  "/users/me": {},
  "/users/register": {},
  "/users/signin": {},
  "/users/signout": {},
  "/decks": {},
  "/decks/new": {},
  "/decks/import": {},
  "/decks/$id": {
    params: Z_ID_PARAMS,
    query: Z_PAGINATION_QUERY,
  },
  "/decks/$id/edit": {
    params: Z_ID_PARAMS,
  },
  "/decks/$id/practice": {
    params: Z_ID_PARAMS,
  },
  "/decks/$id/history": {
    params: Z_ID_PARAMS,
    query: z
      .object({
        practiceEntryId: z.coerce.number().int().optional(),
      })
      .merge(Z_PAGINATION_QUERY),
  },
  "/decks/$id/history-graph": {
    params: Z_ID_PARAMS,
    query: z.object({
      graphType: z.enum(["action", "queue"]).default("action"),
      rangeType: z.enum(["week", "month"]).default("week"),
      page: z.coerce.number().int().optional().default(0), // 0 => this week/month, 1 => last week/month, ...
      now: z.coerce.date().optional(), // for testing
    }),
  },
  "/decks/$id/export": {
    params: Z_ID_PARAMS,
  },
  // ts-prune-ignore-next something buggy in ts-prune
} satisfies Record<string, { params?: z.ZodType; query?: z.ZodType }>;

//
// type-safe route url formatter
//

type RouteDef = typeof ROUTE_DEF;

// prettier-ignore
type RouteFormatter = {
  [K in keyof RouteDef]:
    RouteDef[K] extends { params: z.ZodType, query: z.ZodType }
      ? (params: z.input<RouteDef[K]["params"]>, query?: z.input<RouteDef[K]["query"]>) => string
      :

    RouteDef[K] extends { params: z.ZodType }
      ? (params: z.input<RouteDef[K]["params"]>) => string
      :

    RouteDef[K] extends { query: z.ZodType }
      ? (params?: null, query?: z.input<RouteDef[K]["query"]>) => string

      : () => string;
}

export const $R = createGetProxy((path) => {
  return (params?: unknown, query?: unknown) => {
    tinyassert(typeof path === "string");
    tinyassert(path in ROUTE_DEF);
    const def = ROUTE_DEF[path as keyof RouteDef];

    if ("params" in def) {
      tinyassert(params);
      for (const [k, v] of Object.entries(params)) {
        path = path.replace("$" + k, String(v));
      }
    }
    if ("query" in def && query) {
      const search = new URLSearchParams(
        Object.entries(query).map(([k, v]) => [k, String(v)])
      );
      path = path + "?" + search;
    }

    return path;
  };
}) as RouteFormatter;

//
// allow old usage for path without params
//

// prettier-ignore
type RouteFormatterV1 = {
  [K in keyof RouteDef]:
    RouteDef[K] extends { params: z.ZodType }
      ? never
      : string;
}

export const R = createGetProxy((path) => path) as RouteFormatterV1;
