import BarOfProgress from "@badrap/bar-of-progress";

export function navigateRefresh(href: string) {
  // show fading overlay to prevent further interaction
  const overlay = document.createElement("div");
  overlay.className = "z-100 fixed inset-0 bg-black opacity-40";
  document.body.appendChild(overlay);

  // show progress bar to indicate loading
  new BarOfProgress({ size: 3 }).start();

  // load url
  window.location.href = href;
}
