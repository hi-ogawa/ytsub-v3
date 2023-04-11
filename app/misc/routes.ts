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
  "/decks?index": "/decks?index",
  "/decks/new": "/decks/new",
  "/decks/import": "/decks/import",
  "/decks/$id": (id: number) => `/decks/${id}`,
  "/decks/$id?index": (id: number) => `/decks/${id}?index`,
  "/decks/$id/edit": (id: number) => `/decks/${id}/edit`,
  "/decks/$id/practice": (id: number) => `/decks/${id}/practice`,
  "/decks/$id/history": (id: number) => `/decks/${id}/history`,
  "/decks/$id/history-graph": (id: number) => `/decks/${id}/history-graph`,
  "/decks/$id/export": (id: number) => `/decks/${id}/export`,
};
