import { ActionFunction, LoaderFunction } from "@remix-run/server-runtime";
import * as qs from "qs";
import { afterAll, beforeAll } from "vitest";
import { UserTable, tables } from "../../db/models";
import { register, sha256, signinSession } from "../../utils/auth";
import { commitSession, getSession } from "../../utils/session.server";

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

export function useUser({
  username = "root",
  password = "pass",
  seed,
}: {
  username?: string;
  password?: string;
  seed?: string;
}) {
  // Generating random-ish username to avoid db uniqueness constraint
  if (seed !== undefined) {
    username += "-" + sha256(seed).slice(0, 8);
  }

  let user: UserTable;
  let cookie: string;

  beforeAll(async () => {
    await tables.users().delete().where("username", username);
    user = await register({ username, password });
    const session = await getSession();
    signinSession(session, user);
    cookie = await commitSession(session);
  });

  afterAll(async () => {
    await tables.users().delete().where("username", username);
  });

  function signin(request: Request): Request {
    request.headers.set("cookie", cookie);
    return request;
  }

  return { user: () => user, signin };
}
