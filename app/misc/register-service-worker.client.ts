// see scripts/copy-assets.sh
const SERVICE_WORKER_PATH = "/service-worker.js";

export function registerServiceWorker() {
  const { serviceWorker } = window.navigator;
  if (serviceWorker) {
    window.addEventListener("load", async () => {
      await serviceWorker.register(SERVICE_WORKER_PATH);
    });
  }
}
