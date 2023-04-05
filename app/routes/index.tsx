import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { R } from "../misc/routes";
import { Controller, makeLoader } from "../utils/controller-utils";
import { useDeserialize } from "../utils/hooks";
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

export const loader = makeLoader(Controller, async function () {
  const parsed = PAGINATION_PARAMS_SCHEMA.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/"]);
  }

  const data: VideosLoaderData = await getVideosLoaderData(parsed.data);
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: VideosLoaderData = useDeserialize(useLoaderData());
  return <VideoListComponent {...data} />;
}
