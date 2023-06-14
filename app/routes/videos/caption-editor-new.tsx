import { useNavigate } from "@remix-run/react";
import { useForm } from "react-hook-form";
import { $R } from "../../misc/routes";
import type { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Caption editor",
};

export default function Page() {
  const form = useForm({ defaultValues: { videoId: "" } });
  const navigate = useNavigate();

  // TODO: list draft from localstorage

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col">
        <div className="p-6 flex flex-col gap-3">
          <div className="text-2xl">Caption Editor</div>
          <form
            className="w-full flex flex-col gap-3"
            onSubmit={form.handleSubmit((data) => {
              navigate(
                $R["/videos/caption-editor"](null, { videoId: data.videoId })
              );
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
        </div>
      </div>
    </div>
  );
}
