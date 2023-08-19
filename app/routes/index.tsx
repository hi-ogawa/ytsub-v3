import { useLoaderDataExtra } from "../utils/loader-utils";
import type { PageHandle } from "../utils/page-handle";
import { VideoListComponent } from "./videos";
import type { VideosLoaderData } from "./videos/index.server";

export { loader } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => "Examples",
};

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as VideosLoaderData;
  return <VideoListComponent {...data} />;
}
