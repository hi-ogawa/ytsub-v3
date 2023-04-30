import { useLoaderDataExtra } from "../utils/loader-utils";
import { makeLoader } from "../utils/loader-utils.server";
import type { PageHandle } from "../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../utils/pagination";
import {
  VideoListComponent,
  VideosLoaderData,
  getVideosLoaderData,
} from "./videos";

export const handle: PageHandle = {
  navBarTitle: () => "Examples",
};

export const loader = /* @__PURE__ */ makeLoader(async ({ ctx }) => {
  const query = PAGINATION_PARAMS_SCHEMA.parse(ctx.query);
  const loaderData: VideosLoaderData = await getVideosLoaderData(query);
  return loaderData;
});

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as VideosLoaderData;
  return <VideoListComponent {...data} />;
}
