import type { LoaderFunction } from "@remix-run/server-runtime";

// use loader since otherwise it's tricky to reference assets

export const loader: LoaderFunction = () =>
  new Response(SERVICE_WORKER_JS, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
    },
  });

const SERVICE_WORKER_JS = `
// satisfy minimal requirements for PWA
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`;
