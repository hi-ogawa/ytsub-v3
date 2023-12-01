import { useLoaderDataExtra } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import type { VideosLoaderData } from "./index.server";
import { VideoListComponent } from "./index.utils";
export { loader } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => "Your Videos",
};

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as VideosLoaderData;
  return <VideoListComponent {...data} />;
}
