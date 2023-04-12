import { tinyassert } from "@hiogawa/utils";
import { z } from "zod";
import { createGetProxy } from "../utils/proxy-utiils";

// Centralize route definitions to facilitate static analysis.e.g.
// - prevent typo by type check
// - auto-completion
// - refactoring routes via "Rename symbol"
// - showing usage via "Find all references"

// prettier-ignore
export const R = {
  "/": "/",
  "/videos": "/videos",
  "/videos/new": "/videos/new",
  "/videos/$id": (id: number) => `/videos/${id}`,
  "/bookmarks": "/bookmarks",
  "/users/me": "/users/me",
  "/users/register": "/users/register",
  "/users/signin": "/users/signin",
  "/users/signout": "/users/signout",
  "/decks": "/decks",
  "/decks/new": "/decks/new",
  "/decks/import": "/decks/import",
  "/decks/$id": (id: number) => `/decks/${id}`,
  "/decks/$id/edit": (id: number) => `/decks/${id}/edit`,
  "/decks/$id/practice": (id: number) => `/decks/${id}/practice`,
  "/decks/$id/history": (id: number) => `/decks/${id}/history`,
  "/decks/$id/history-graph": (id: number) => `/decks/${id}/history-graph`,
  "/decks/$id/export": (id: number) => `/decks/${id}/export`,
};

//
// type-safe route url definition
//

const Z_ID_PARAMS = z.object({
  id: z.coerce.number().int(),
});

const Z_PAGE_QUERY = z.object({
  page: z.coerce.number().int().optional(),
  perPage: z.coerce.number().int().optional(),
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
    query: z.object({
      videoId: z.coerce.number().int().optional(),
      deckId: z.coerce.number().int().optional(),
      order: z.coerce.string().optional(),
    }),
  },
  "/users/me": {},
  "/users/register": {},
  "/users/signin": {},
  "/users/signout": {},
  "/decks/new": {},
  "/decks/import": {},
  "/decks/$id": {
    params: Z_ID_PARAMS,
    query: Z_PAGE_QUERY,
  },
  "/decks/$id/edit": {
    params: Z_ID_PARAMS,
  },
  "/decks/$id/practice": {
    params: Z_ID_PARAMS,
  },
  "/decks/$id/history": {
    params: Z_ID_PARAMS,
    query: z.object({
      practiceEntryId: z.coerce.number().int().optional(),
    }),
  },
  "/decks/$id/history-graph": {
    params: Z_ID_PARAMS,
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
      ? (params: z.infer<RouteDef[K]["params"]>, query?: z.infer<RouteDef[K]["query"]>) => string
      :

    RouteDef[K] extends { params: z.ZodType }
      ? (params: z.infer<RouteDef[K]["params"]>) => string
      :

    RouteDef[K] extends { query: z.ZodType }
      ? (params?: null, query?: z.infer<RouteDef[K]["query"]>) => string

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
