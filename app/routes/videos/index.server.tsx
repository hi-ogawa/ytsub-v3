import { E, T, db, toPaginationResult } from "../../db/drizzle-client.server";
import type { VideoTable } from "../../db/models";
import { ctx_get } from "../../server/request-context/storage";
import {
  ctx_requireUserOrRedirect,
  wrapLoader,
} from "../../utils/loader-utils.server";
import {
  PAGINATION_PARAMS_SCHEMA,
  PaginationMetadata,
  PaginationParams,
} from "../../utils/pagination";

export interface VideosLoaderData {
  videos: VideoTable[];
  pagination: PaginationMetadata;
}

export async function getVideosLoaderData(
  paginationParams: PaginationParams,
  userId?: number
): Promise<VideosLoaderData> {
  const [videos, pagination] = await toPaginationResult(
    db
      .select()
      .from(T.videos)
      .where(userId ? E.eq(T.videos.userId, userId) : E.isNull(T.videos.userId))
      .orderBy(E.desc(T.videos.updatedAt), E.desc(T.videos.id)),
    paginationParams
  );
  return { videos, pagination };
}

export const loader = wrapLoader(async () => {
  const user = await ctx_requireUserOrRedirect();
  const query = PAGINATION_PARAMS_SCHEMA.parse(ctx_get().urlQuery);
  const loaderData: VideosLoaderData = await getVideosLoaderData(
    query,
    user.id
  );
  return loaderData;
});
