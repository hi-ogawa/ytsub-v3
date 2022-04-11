// Centralize route definitions to facilitate static analysis.e.g.
// - prevent typo by type check
// - auto-completion
// - refactoring routes via "Rename symbol"
// - showing usage via "Find all references"

export const R = {
  "/": "/",
  "/videos/new": "/videos/new",
  "/videos/history": "/videos/history",
  "/videos/$id": (id: number) => `/videos/${id}`,
  "/bookmarks/new": "/bookmarks/new",
  "/users/me": "/users/me",
  "/users/register": "/users/register",
  "/users/signin": "/users/signin",
  "/users/signout": "/users/signout",
};
