import { makeLoader } from "../utils/loader-utils.server";

export const loader = makeLoader(({ ctx }) => {
  ctx.cacheResponse();
  return new Response(SERVICE_WORKER_JS, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
    },
  });
});

const SERVICE_WORKER_JS = `
// satisfy minimal requirements for PWA
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`;
