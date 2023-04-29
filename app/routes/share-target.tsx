import { tinyassert } from "@hiogawa/utils";
import type { LoaderFunction } from "@remix-run/server-runtime";
import { $R, ROUTE_DEF } from "../misc/routes";
import { createLoaderTrpc } from "../trpc/remix-utils.server";
import { parseVideoId } from "../utils/youtube";

export const loader: LoaderFunction = async (args) => {
  const { ctx } = await createLoaderTrpc(args);
  return ctx.redirectOnError(() => {
    const query = ROUTE_DEF["/share-target"].query.parse(ctx.query);
    const videoId = parseVideoId(query["share-target-text"]);
    tinyassert(videoId);
    return ctx.redirect($R["/videos/new"](null, { videoId }));
  });
};
