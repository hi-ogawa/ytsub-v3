import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { Link, useNavigate } from "@remix-run/react";
import {
  STORAGE_KEYS,
  Z_CAPTION_EDITOR_DRAFT_LIST,
  useLocalStorage,
} from "#components/caption-editor-utils";
import { $R } from "#misc/routes";
import { ClientOnly } from "#utils/misc-react";
import type { PageHandle } from "#utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Caption Editor",
};

export default function Page() {
  const form = useTinyForm({ videoId: "" });
  const navigate = useNavigate();

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col">
        <div className="p-6 flex flex-col gap-3">
          <div className="text-2xl">Caption Editor</div>
          <form
            className="w-full flex flex-col gap-3"
            onSubmit={form.handleSubmit(() => {
              navigate(
                $R["/caption-editor/watch"](null, { v: form.data.videoId })
              );
            })}
          >
            <label className="flex flex-col gap-1">
              <span className="text-colorTextLabel">Video ID or URL</span>
              <input
                type="text"
                className="antd-input p-1"
                required
                {...form.fields.videoId.props()}
              />
            </label>
            <button type="submit" className="antd-btn antd-btn-primary p-1">
              Load
            </button>
          </form>
          <div className="border-t my-3"></div>
          <ClientOnly>
            <DraftList />
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}

function DraftList() {
  const [draftList = [], setDraftList] = useLocalStorage(
    Z_CAPTION_EDITOR_DRAFT_LIST,
    `${STORAGE_KEYS.captionEditorDraftList}`
  );

  return (
    <>
      <div className="text-2xl">Draft</div>
      {!draftList.length && <div>Empty</div>}
      {!!draftList.length && (
        <ul className="flex flex-col gap-2">
          {draftList.map((e) => (
            <li
              key={e.videoId}
              className="flex items-center border antd-btn antd-btn-text pr-2"
            >
              <Link
                className="flex-1 p-2"
                to={$R["/caption-editor/watch"](null, {
                  v: e.videoId,
                })}
              >
                {e.videoId}
              </Link>
              <button
                className="antd-btn antd-btn-ghost i-ri-close-line w-5 h-5"
                onClick={() => {
                  if (
                    window.confirm(`Are you sure to delete '${e.videoId}'?`)
                  ) {
                    setDraftList(
                      draftList.filter((e2) => e2.videoId !== e.videoId)
                    );
                  }
                }}
              ></button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
