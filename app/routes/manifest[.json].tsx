import type { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = () => MANIFEST_JSON;

const MANIFEST_JSON = {
  short_name: "Ytsub",
  name: "Ytsub",
  icons: [
    {
      src: require("../assets/icon-192.png"),
      type: "image/png",
      sizes: "192x192",
    },
    {
      src: require("../assets/icon-512.png"),
      type: "image/png",
      sizes: "512x512",
    },
  ],
  start_url: "/",
  scope: "/",
  theme_color: "#FFFFFF",
  background_color: "#FFFFFF",
  display: "standalone",
  share_target: {
    action: "/share-target",
    method: "GET",
    enctype: "application/x-www-form-urlencoded",
    params: {
      title: "share-target-title",
      text: "share-target-text",
      url: "share-target-url",
    },
  },
};
