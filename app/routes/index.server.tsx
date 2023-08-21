import { ctx_get } from "../server/request-context/storage";
import { wrapLoader } from "../utils/loader-utils.server";
import { PAGINATION_PARAMS_SCHEMA } from "../utils/pagination";
import { VideosLoaderData, getVideosLoaderData } from "./videos/index.server";

export const loader = wrapLoader(async () => {
  const query = PAGINATION_PARAMS_SCHEMA.parse(ctx_get().urlQuery);
  const loaderData: VideosLoaderData = await getVideosLoaderData(query);
  return loaderData;
});
