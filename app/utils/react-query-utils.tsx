import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import { rpcClientQuery } from "#trpc/client";
import { useDocumentEvent } from "#utils/hooks-client-utils";
import { toast } from "#utils/toast-utils";

export function QueryClientWrapper({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(() => createQueryClient());

  const [showDevtools, setShowDevtools] = React.useState(true);

  // alt + shift + q to toggle
  useDocumentEvent("keyup", (e) => {
    if (e.altKey && e.key === "Q") {
      setShowDevtools((prev) => !prev);
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && showDevtools && (
        <ReactQueryDevtools buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}

function createQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      // default staleTime = 0, cacheTime = 5 min
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        onError(error, _variables, _context) {
          console.error("[mutation error]", error);
          toast.error("Something went wrong...");
        },
      },
    },
    queryCache: new QueryCache({
      onError(error, _query) {
        console.error("[query error]", error);
        toast.error("Something went wrong...");
      },
    }),
  });

  queryClient.setQueryDefaults(
    rpcClientQuery.videos_getCaptionEntries.queryKey,
    {
      staleTime: Infinity,
      gcTime: Infinity,
    }
  );

  return queryClient;
}
