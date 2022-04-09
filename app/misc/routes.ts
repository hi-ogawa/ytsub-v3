// Centralize route definitions to facilitate static analysis.e.g.
// - prevent typo by type check
// - auto-completion
// - refactoring routes via "Rename symbol"
// - showing usage via "Find all references"

export const R = {
  "/": "/",
  "/setup": "/setup",
  "/videos/new": "/videos/new",
  "/videos/create": "/videos/create",
  "/videos/$id": (id: number) => `/videos/${id}`,
  "/users/me": "/users/me",
  "/users/register": "/users/register",
  "/users/signin": "/users/signin",
  "/users/signout": "/users/signout",
};
