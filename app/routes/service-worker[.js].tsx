import type { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = () =>
  new Response(SERVICE_WORKER_JS, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
    },
  });

// satisfy minimal requirements for PWA
const SERVICE_WORKER_JS = `
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`;
