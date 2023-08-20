import { makeLoader } from "../utils/loader-utils.server";
import { PAGINATION_PARAMS_SCHEMA } from "../utils/pagination";
import { VideosLoaderData, getVideosLoaderData } from "./videos/index.server";

export const loader = makeLoader(async ({ ctx }) => {
  const query = PAGINATION_PARAMS_SCHEMA.parse(ctx.query);
  const loaderData: VideosLoaderData = await getVideosLoaderData(query);
  return loaderData;
});
