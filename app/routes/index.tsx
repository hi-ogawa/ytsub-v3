import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { PaginationResult, VideoTable } from "../db/models";
import { prismaClient } from "../db/prisma-client.server";
import { R } from "../misc/routes";
import { Controller, makeLoader } from "../utils/controller-utils";
import { useDeserialize } from "../utils/hooks";
import { PageHandle } from "../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../utils/pagination";
import { VideoListComponent } from "./videos";

export const handle: PageHandle = {
  navBarTitle: () => "Examples",
};

interface LoaderData {
  pagination: PaginationResult<VideoTable>;
}

export const loader = makeLoader(Controller, async function () {
  const parsed = PAGINATION_PARAMS_SCHEMA.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/"]);
  }

  const { page, perPage } = parsed.data;
  const results = await prismaClient.videos.findMany({
    where: {
      userId: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    skip: (page - 1) * perPage,
    take: perPage,
  });
  const total = await prismaClient.videos.count({
    where: {
      userId: null,
    },
  });
  const pagination = {
    data: results,
    page,
    perPage,
    total,
    totalPage: Math.ceil(total / perPage),
  };
  const data: LoaderData = { pagination } as any; // TODO: typing difference null vs undefined
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: LoaderData = useDeserialize(useLoaderData());
  return <VideoListComponent pagination={data.pagination} />;
}
