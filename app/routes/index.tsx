import type { LoaderData } from "#routes/index.server";
import { VideoListComponent } from "#routes/videos/_ui";
import { useLoaderDataExtra } from "#utils/loader-utils";
import type { PageHandle } from "#utils/page-handle";

export { loader } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => "Examples",
};

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as LoaderData;
  return <VideoListComponent {...data} />;
}
