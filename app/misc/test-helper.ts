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
import { toQuery } from "../utils/url-data";
import type { NewVideo, fetchCaptionEntries } from "../utils/youtube";
import { useUserImpl } from "./test-helper-common";

const DUMMY_URL = "http://localhost:3000";

export function testLoader(
  loader: LoaderFunction,
  {
    method,
    query,
    form,
    json,
    params = {},
    transform,
  }: {
    method?: "GET" | "POST" | "DELETE";
    query?: any;
    form?: any;
    params?: Record<string, string>;
    json?: unknown;
    transform?: (request: Request) => Request;
  } = {}
) {
  let url = DUMMY_URL;
  if (query) {
    url += "/?" + toQuery(query);
  }
  let request = new Request(url, { method: method ?? "GET" });
  if (json) {
    request = new Request(url, {
      method: method ?? "POST",
      body: JSON.stringify(json),
    });
  }
  if (form) {
    request = new Request(url, {
      method: method ?? "POST",
      body: toQuery(form),
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
    });
  }
  if (transform) {
    request = transform(request);
  }
  return loader({
    request,
    context: {},
    params,
  });
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
