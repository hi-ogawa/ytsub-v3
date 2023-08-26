import { ctx_get } from "../server/request-context/storage";
import { PAGINATION_PARAMS_SCHEMA } from "../utils/pagination";
import { VideosLoaderData, getVideosLoaderData } from "./videos/index.server";

export type LoaderData = VideosLoaderData;

export const loader = async () => {
  const query = PAGINATION_PARAMS_SCHEMA.parse(ctx_get().urlQuery);
  const loaderData: LoaderData = await getVideosLoaderData(query);
  return loaderData;
};
