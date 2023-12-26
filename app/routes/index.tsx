import { useLoaderDataExtra } from "../utils/loader-utils";
import type { PageHandle } from "../utils/page-handle";
import { VideoListComponent } from "./videos/_ui";

export { loader } from "./index.server";
import type { LoaderData } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => "Examples",
};

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as LoaderData;
  return <VideoListComponent {...data} />;
}
