import { useQuery } from "@tanstack/react-query";
import { rpcClientQuery } from "../trpc/client";

// TODO
// - initialize data by root loader
// - allow invalidation e.g. after user update
// - refresh if it expires within 1 day

export function useCurrentUser() {
  const query = useQuery({
    ...rpcClientQuery.users_me.queryOptions,
    // initialData: null
  });
  return { query };
}
