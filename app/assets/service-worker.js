/// <reference lib="webworker" />

/**
 * @param {ServiceWorkerGlobalScope} worker
 */
function main(worker) {
  // satisfy minimal requirements for PWA
  worker.addEventListener("fetch", (event) => {
    event.respondWith(fetch(event.request));
  });
}

main(self);
