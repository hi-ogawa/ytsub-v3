import { ActionFunction, LoaderFunction } from "@remix-run/server-runtime";
import * as qs from "qs";
import { afterAll, beforeAll } from "vitest";
import { UserTable } from "../../db/models";
import { useUserImpl } from "../../misc/helper";
import { createUserCookie } from "../../utils/auth";

const DUMMY_URL = "http://localhost:3000";

export function testLoader(loader: LoaderFunction, { data }: { data: any }) {
  const serialized = qs.stringify(data, { allowDots: true });
  return loader({
    request: new Request(DUMMY_URL + "/?" + serialized),
    context: {},
    params: {},
  });
}

export function testAction(
  loader: ActionFunction,
  { data = {}, headers = {} }: { data?: any; headers?: Record<string, string> },
  preprocess: (request: Request) => Request = (request) => request
) {
  const serialized = qs.stringify(data, { allowDots: true });
  const request = new Request(DUMMY_URL, {
    method: "POST",
    body: serialized,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
  });
  return loader({
    request: preprocess(request),
    context: {},
    params: {},
  });
}

export function useUser(...args: Parameters<typeof useUserImpl>) {
  const { before, after } = useUserImpl(...args);

  let user: UserTable;
  let cookie: string;

  beforeAll(async () => {
    user = await before();
    cookie = await createUserCookie(user);
  });

  afterAll(async () => {
    await after();
  });

  function signin(request: Request): Request {
    request.headers.set("cookie", cookie);
    return request;
  }

  return { user: () => user, signin };
}
