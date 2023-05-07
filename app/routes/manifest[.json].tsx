import { makeLoader } from "../utils/loader-utils.server";

// it could be moved to `/public` but the loader conveniently works for now.

export const loader = makeLoader(({ ctx }) => {
  ctx.cacheResponse();
  return MANIFEST_JSON;
});

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
