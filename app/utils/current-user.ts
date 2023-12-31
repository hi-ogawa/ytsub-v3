import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { TT } from "#db/drizzle-client.server";
import { none } from "#utils/misc";

// globally manage "currentUser" by
// - initially hydrate query from root loader data
// - mutate on register/signin/signout without page refresh
// - auto refresh session when close to expiring (TODO)

const queryKey = ["useCurrentUser"];

export function useCurrentUser() {
  const query = useQuery({
    queryKey,
    queryFn: () => none<TT["users"]>() ?? null, // tanstack query rejects `undefined`
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return query.data;
}

export function useSetCurrentUser() {
  const queryClient = useQueryClient();
  function setCurrentUser(user?: TT["users"]) {
    queryClient.setQueryData(queryKey, user ?? null);
  }
  return setCurrentUser;
}

// cf. https://github.com/TanStack/query/blob/13b17ee45de3299dd3d3a2dfc3d23ad2f024882a/packages/react-query/src/HydrationBoundary.tsx#L26-L34
export function useHydrateCurrentUser(v?: TT["users"]) {
  const setCurrentUser = useSetCurrentUser();
  React.useMemo(() => setCurrentUser(v), [v]);
}
