import { VideoListComponent } from "#routes/videos/_ui";
import type { VideosLoaderData } from "#routes/videos/index.server";
import { useLoaderDataExtra } from "#utils/loader-utils";
import type { PageHandle } from "#utils/page-handle";

export { loader } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => "Your Videos",
};

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as VideosLoaderData;
  return <VideoListComponent {...data} />;
}
