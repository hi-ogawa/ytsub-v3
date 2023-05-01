import fs from "node:fs";
import { newPromiseWithResolvers, tinyassert } from "@hiogawa/utils";
import type { LoaderFunction } from "@remix-run/server-runtime";
import { afterAll, beforeAll } from "vitest";
import { E, T, db } from "../db/drizzle-client.server";
import {
  CaptionEntryTable,
  UserTable,
  VideoTable,
  getVideoAndCaptionEntries,
  insertVideoAndCaptionEntries,
} from "../db/models";
import { createUserCookie } from "../utils/auth";
import type { NewVideo, fetchCaptionEntries } from "../utils/youtube";
import { useUserImpl } from "./test-helper-common";

export function testLoader(
  loader: LoaderFunction,
  {
    query,
    params,
    transform,
  }: {
    query?: Record<string, unknown>;
    params?: Record<string, unknown>;
    transform?: (request: Request) => Request;
  } = {}
) {
  let url = "http://localhost:3000"; // dummy url
  if (query) {
    url += "?" + new URLSearchParams(stringifyValues(query));
  }
  let request = new Request(url);
  if (transform) {
    request = transform(request);
  }
  return loader({
    request,
    context: {},
    params: stringifyValues(params ?? {}),
  });
}

function stringifyValues(
  data: Record<string, unknown>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );
}

export function useUser(...args: Parameters<typeof useUserImpl>) {
  const { before, after } = useUserImpl(...args);

  let user: UserTable;
  let cookie: string;
  let isReady = newPromiseWithResolvers<void>();

  beforeAll(async () => {
    user = await before();
    cookie = await createUserCookie(user);
    isReady.resolve();
  });

  afterAll(async () => {
    await after();
  });

  function signin(request: Request): Request {
    request.headers.set("cookie", cookie);
    return request;
  }

  return {
    signin,
    isReady: isReady.promise,
    get data() {
      return user;
    },
  };
}

const FIXTURE_FIDEO: NewVideo = {
  videoId: "EnPYXckiUVg",
  language1: { id: ".fr" },
  language2: { id: ".en" },
};

const FIXTURE_FILE = "misc/fixture/fetchCaptionEntries-EnPYXckiUVg-fr-en.txt";

async function fetchCaptionEntriesFixture(): ReturnType<
  typeof fetchCaptionEntries
> {
  const raw = await fs.promises.readFile(FIXTURE_FILE, "utf-8");
  return JSON.parse(raw);
}

function useVideo(userHook?: ReturnType<typeof useUser>) {
  let result: { video: VideoTable; captionEntries: CaptionEntryTable[] };

  beforeAll(async () => {
    await userHook?.isReady;
    const data = await fetchCaptionEntriesFixture();
    const videoId = await insertVideoAndCaptionEntries(
      FIXTURE_FIDEO,
      data,
      userHook?.data.id
    );
    const resultOption = await getVideoAndCaptionEntries(videoId);
    tinyassert(resultOption);
    result = resultOption;
  });

  afterAll(async () => {
    await db.delete(T.videos).where(E.eq(T.videos.id, result.video.id));
  });

  return {
    get video() {
      return result.video;
    },
    get captionEntries() {
      return result.captionEntries;
    },
  };
}

export function useUserVideo(args: Parameters<typeof useUser>[0]) {
  const userHook = useUser(args);
  const videoHook = useVideo(userHook);

  return {
    signin: userHook.signin,
    get user() {
      return userHook.data;
    },
    get video() {
      return videoHook.video;
    },
    get captionEntries() {
      return videoHook.captionEntries;
    },
  };
}
