import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import { trpc } from "../trpc/client";
import { useDocumentEvent } from "./hooks-client-utils";

export function QueryClientWrapper({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(() => createQueryClient());

  const [showDevtools, setShowDevtools] = React.useState(false);

  // alt + shift + q to toggle
  useDocumentEvent("keyup", (e) => {
    if (e.altKey && e.key === "Q") {
      setShowDevtools((prev) => !prev);
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevtools && <ReactQueryDevtools />}
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
    },
  });

  queryClient.setQueryDefaults([trpc.videos_getCaptionEntries.queryKey], {
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  queryClient.setQueryDefaults([trpc.bookmarks_detail.queryKey], {
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  return queryClient;
}
