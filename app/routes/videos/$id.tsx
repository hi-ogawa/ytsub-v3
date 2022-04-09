import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { z } from "zod";
import { CaptionEntryTable, VideoTable, tables } from "../../db/models";
import {
  Controller,
  deserialize,
  makeLoader,
} from "../../utils/controller-utils";
import { useMemoWrap } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";
import { pushFlashMessage } from "../../utils/session-utils";

export const handle: PageHandle = {
  navBarTitle: "Watch",
};

const SCHEMA = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

type LoaderData = { video: VideoTable; captionEntries: CaptionEntryTable[] };

export const loader = makeLoader(Controller, async function () {
  const parsed = SCHEMA.safeParse(this.args.params);
  if (parsed.success) {
    const { id } = parsed.data;
    const video = await tables.videos().select("*").where("id", id).first();
    if (video) {
      const captionEntries = await tables
        .captionEntries()
        .select("*")
        .where("videoId", id);
      const loaderData: LoaderData = { video, captionEntries };
      return this.serialize(loaderData);
    }
  }
  pushFlashMessage(this.session, {
    content: "Invalid Video ID",
    variant: "error",
  });
  return redirect("/");
});

// TODO: migrate components from `watch.tsx`

export default function DefaultComponent() {
  const data: LoaderData = useMemoWrap(deserialize, useLoaderData());
  return (
    <div className="w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-lg rounded-lg border border-base-300">
        <div className="h-full p-6 flex flex-col">
          <pre className="whitespace-pre-wrap text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
