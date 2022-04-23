// Centralize route definitions to facilitate static analysis.e.g.
// - prevent typo by type check
// - auto-completion
// - refactoring routes via "Rename symbol"
// - showing usage via "Find all references"

// prettier-ignore
export const R = {
  "/": "/",
  "/health-check": "/health-check",
  "/videos": "/videos",
  "/videos/new": "/videos/new",
  "/videos/$id": (id: number) => `/videos/${id}`,
  "/bookmarks": "/bookmarks",
  "/bookmarks/new": "/bookmarks/new",
  "/users/me": "/users/me",
  "/users/register": "/users/register",
  "/users/signin": "/users/signin",
  "/users/signout": "/users/signout",
  "/decks": "/decks",
  "/decks/new": "/decks/new",
  "/decks/$id": (id: number) => `/decks/${id}`,
  "/decks/$id/practice": (id: number) => `/decks/${id}/practice`,
  "/decks/$id/new-practice-entry": (id: number) => `/decks/${id}/new-practice-entry`,
  "/decks/$id/new-practice-action": (id: number) => `/decks/${id}/new-practice-action`,
};
