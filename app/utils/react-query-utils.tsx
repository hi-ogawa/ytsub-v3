import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import { useDocumentEvent } from "./hooks-client-utils";

export function QueryClientWrapper({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

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
