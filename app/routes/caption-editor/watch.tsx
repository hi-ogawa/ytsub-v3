import { uniqBy } from "@hiogawa/utils";
import { CaptionEditor } from "../../components/caption-editor";
import {
  STORAGE_KEYS,
  Z_CAPTION_EDITOR_DRAFT_LIST,
  Z_CAPTION_EDITOR_ENTRY_LIST,
  useLocalStorage,
} from "../../components/caption-editor-utils";
import { useLoaderDataExtra } from "../../utils/loader-utils";
import { ClientOnly } from "../../utils/misc-react";
import type { PageHandle } from "../../utils/page-handle";
import type { LoaderData } from "./watch.server";

export { loader } from "./watch.server";

export const handle: PageHandle = {
  navBarTitle: () => "Caption Editor",
};

export default function Page() {
  return (
    <ClientOnly>
      <PageInner />
    </ClientOnly>
  );
}

function PageInner() {
  const { videoId, videoMetadata } = useLoaderDataExtra() as LoaderData;

  const [draftData = [], setDraftData] = useLocalStorage(
    Z_CAPTION_EDITOR_ENTRY_LIST,
    `${STORAGE_KEYS.captionEditorEntryListByVideoId}:${videoId}`
  );

  const [draftList = [], setDraftList] = useLocalStorage(
    Z_CAPTION_EDITOR_DRAFT_LIST,
    `${STORAGE_KEYS.captionEditorDraftList}`
  );

  return (
    <div className="p-2 h-full">
      <CaptionEditor
        videoId={videoId}
        videoMetadata={videoMetadata}
        defaultValue={draftData}
        onChange={(data) => {
          setDraftData(data);
          setDraftList(uniqBy([...draftList, { videoId }], (e) => e.videoId));
        }}
      />
    </div>
  );
}
