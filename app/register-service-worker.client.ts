// see scripts/copy-assets.sh
const SERVICE_WORKER_PATH = "/service-worker.js";

export function registerServiceWorker() {
  const { serviceWorker } = window.navigator;
  if (serviceWorker) {
    window.addEventListener("load", async () => {
      const registration = await serviceWorker.register(SERVICE_WORKER_PATH);
      console.debug("service worker registration success", registration);
    });
  }
}
