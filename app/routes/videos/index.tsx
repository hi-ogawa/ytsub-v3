import { useLoaderDataExtra } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import { VideoListComponent } from "./_ui";
import type { VideosLoaderData } from "./index.server";

export { loader } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => "Your Videos",
};

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as VideosLoaderData;
  return <VideoListComponent {...data} />;
}
