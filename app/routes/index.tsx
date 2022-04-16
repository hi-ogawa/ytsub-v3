import { useLoaderData } from "@remix-run/react";
import * as React from "react";
import { tables } from "../db/models";
import { Controller, makeLoader } from "../utils/controller-utils";
import { useDeserialize } from "../utils/hooks";
import { PageHandle } from "../utils/page-handle";
import { HistoryComponent, HistoryLoaderData } from "./videos";

export const handle: PageHandle = {
  navBarTitle: "Examples",
};

export const loader = makeLoader(Controller, async function () {
  const videos = await tables
    .videos()
    .select("*")
    .where("userId", null)
    .orderBy("createdAt", "desc");
  const data: HistoryLoaderData = { videos };
  return this.serialize(data);
});

export default function DefaultComponent() {
  const data: HistoryLoaderData = useDeserialize(useLoaderData());
  return <HistoryComponent videos={data.videos} />;
}
