import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import {
  PaginationResult,
  VideoTable,
  tables,
  toPaginationResult,
} from "../db/models";
import { R } from "../misc/routes";
import { Controller, makeLoader } from "../utils/controller-utils";
import { useDeserialize } from "../utils/hooks";
import { PageHandle } from "../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../utils/pagination";
import { VideoListComponent } from "./videos";

export const handle: PageHandle = {
  navBarTitle: "Examples",
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

  const pagination = await toPaginationResult(
    tables.videos().where("userId", null).orderBy("updatedAt", "desc"),
    parsed.data
  );
  const data: LoaderData = { pagination };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: LoaderData = useDeserialize(useLoaderData());
  return <VideoListComponent pagination={data.pagination} />;
}
