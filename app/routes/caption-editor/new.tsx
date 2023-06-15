import { Link, useNavigate } from "@remix-run/react";
import { useForm } from "react-hook-form";
import {
  STORAGE_KEYS,
  Z_CAPTION_EDITOR_DRAFT_LIST,
  useLocalStorage,
} from "../../components/caption-editor-utils";
import { $R } from "../../misc/routes";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Caption editor",
};

export default function Page() {
  const form = useForm({ defaultValues: { videoId: "" } });
  const navigate = useNavigate();

  const [draftList = [], setDraftList] = useLocalStorage(
    Z_CAPTION_EDITOR_DRAFT_LIST,
    `${STORAGE_KEYS.captionEditorDraftList}`
  );

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col">
        <div className="p-6 flex flex-col gap-3">
          <div className="text-2xl">Caption Editor</div>
          <form
            className="w-full flex flex-col gap-3"
            onSubmit={form.handleSubmit((data) => {
              navigate($R["/caption-editor/watch"](null, { v: data.videoId }));
            })}
          >
            <label className="flex flex-col gap-1">
              <span className="text-colorTextLabel">Video ID or URL</span>
              <input
                type="text"
                className="antd-input p-1"
                required
                {...form.register("videoId")}
              />
            </label>
            <button type="submit" className="antd-btn antd-btn-primary p-1">
              Load
            </button>
          </form>
          <div className="border-t my-3"></div>
          <div className="text-2xl">Draft</div>
          {!draftList.length && <div>Empty</div>}
          {!!draftList.length && (
            <ul className="flex flex-col gap-2">
              {draftList.map((e) => (
                <li
                  key={e.videoId}
                  className="flex items-center border antd-btn antd-btn-text p-2"
                >
                  <Link
                    className="flex-1"
                    to={$R["/caption-editor/watch"](null, {
                      v: e.videoId,
                    })}
                  >
                    {e.videoId}
                  </Link>
                  <button
                    className="antd-btn antd-btn-ghost i-ri-close-line w-5 h-5"
                    onClick={() => {
                      if (window.confirm("Are you sure to delete 'xxx'?")) {
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
        </div>
      </div>
    </div>
  );
}
