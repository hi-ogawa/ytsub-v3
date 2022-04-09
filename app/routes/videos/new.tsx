import { redirect } from "@remix-run/server-runtime";
import { filterNewVideo, insertVideoAndCaptionEntries } from "../../db/models";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { PageHandle } from "../../utils/page-handle";
import { NEW_VIDEO_SCHEMA, fetchCaptionEntries } from "../../utils/youtube";

export const handle: PageHandle = {
  navBarTitle: "New Video",
};

export const action = makeLoader(Controller, async function () {
  const parsed = NEW_VIDEO_SCHEMA.safeParse(await this.form());
  if (!parsed.success) throw new AppError("Invalid parameters");

  const user = await this.currentUser();
  const row = await filterNewVideo(parsed.data, user?.id).select("id").first();
  let id = row?.id;
  if (!id) {
    const data = await fetchCaptionEntries(parsed.data);
    id = await insertVideoAndCaptionEntries(parsed.data, data, user?.id);
  }
  return redirect(`/videos/${id}`);
});

// TODO: migrate components from `setup.tsx`
