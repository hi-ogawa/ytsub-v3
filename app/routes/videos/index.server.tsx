import {
  E,
  T,
  TT,
  db,
  toPaginationResult,
} from "../../db/drizzle-client.server";
import { ctx_get } from "../../server/request-context/storage";
import { ctx_requireUserOrRedirect } from "../../utils/loader-utils.server";
import {
  PAGINATION_PARAMS_SCHEMA,
  PaginationMetadata,
  PaginationParams,
} from "../../utils/pagination";

export interface VideosLoaderData {
  videos: TT["videos"][];
  pagination: PaginationMetadata;
  currentUser?: TT["users"];
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

export const loader = async () => {
  const user = await ctx_requireUserOrRedirect();
  const query = PAGINATION_PARAMS_SCHEMA.parse(ctx_get().urlQuery);
  const data = await getVideosLoaderData(query, user.id);
  const loaderData: VideosLoaderData = {
    ...data,
    currentUser: user,
  };
  return loaderData;
};
