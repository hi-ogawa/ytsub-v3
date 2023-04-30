import { makeLoader, useDeLoaderData } from "../utils/loader-utils";
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

export const loader = makeLoader(async ({ ctx }) => {
  const query = PAGINATION_PARAMS_SCHEMA.parse(ctx.query);
  const loaderData: VideosLoaderData = await getVideosLoaderData(query);
  return loaderData;
});

export default function DefaultComponent() {
  const data = useDeLoaderData() as VideosLoaderData;
  return <VideoListComponent {...data} />;
}
