import { LoaderFunction } from "@remix-run/server-runtime";
import * as qs from "qs";

const DUMMY_URL = "http://localhost:3000";

export function testLoader(loader: LoaderFunction, { query }: { query: any }) {
  const search = qs.stringify(query, { allowDots: true });
  return loader({
    request: new Request(DUMMY_URL + "/?" + search),
    context: {},
    params: {},
  });
}
