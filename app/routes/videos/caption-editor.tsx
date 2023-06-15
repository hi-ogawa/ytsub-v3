import { tinyassert } from "@hiogawa/utils";
import React from "react";
import { CaptionEditor } from "../../components/caption-editor";
import { createDraftUtils } from "../../components/caption-editor-utils";
import { ROUTE_DEF } from "../../misc/routes";
import { useLoaderDataExtra } from "../../utils/loader-utils";
import { makeLoader } from "../../utils/loader-utils.server";
import type { PageHandle } from "../../utils/page-handle";
import { parseVideoId } from "../../utils/youtube";

export const handle: PageHandle = {
  navBarTitle: () => "Caption editor",
};

//
// loader
//

type LoaderData = {
  videoId: string;
};

export const loader = makeLoader(async ({ ctx }) => {
  const query = ROUTE_DEF["/videos/caption-editor"].query.parse(ctx.query);
  const videoId = parseVideoId(query.videoId);
  tinyassert(videoId);
  return { videoId } satisfies LoaderData;
});

//
// component
//

export default function Page() {
  const { videoId } = useLoaderDataExtra() as LoaderData;

  const draftUtils = createDraftUtils(videoId);
  const draftData = React.useMemo(() => draftUtils.get() ?? [], []);

  return (
    <div className="p-2 h-full">
      <CaptionEditor
        videoId={videoId}
        defaultValue={draftData}
        onChange={(data) => draftUtils.set(data)}
      />
    </div>
  );
}
