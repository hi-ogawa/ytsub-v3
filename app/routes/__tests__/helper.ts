import { ActionFunction, LoaderFunction } from "@remix-run/server-runtime";
import * as qs from "qs";

const DUMMY_URL = "http://localhost:3000";

export function testLoader(loader: LoaderFunction, { data }: { data: any }) {
  const serialized = qs.stringify(data, { allowDots: true });
  return loader({
    request: new Request(DUMMY_URL + "/?" + serialized),
    context: {},
    params: {},
  });
}

export function testAction(loader: ActionFunction, { data }: { data: any }) {
  const serialized = qs.stringify(data, { allowDots: true });
  return loader({
    request: new Request(DUMMY_URL, {
      method: "POST",
      body: serialized,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    }),
    context: {},
    params: {},
  });
}
