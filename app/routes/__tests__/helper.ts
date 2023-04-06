import { newPromiseWithResolvers, tinyassert } from "@hiogawa/utils";
import type { LoaderFunction } from "@remix-run/server-runtime";
import { afterAll, beforeAll } from "vitest";
import { E, T, db } from "../../db/drizzle-client.server";
import {
  CaptionEntryTable,
  UserTable,
  VideoTable,
  getVideoAndCaptionEntries,
  insertVideoAndCaptionEntries,
} from "../../db/models";
import { useUserImpl } from "../../misc/helper";
import { createUserCookie } from "../../utils/auth";
import { toQuery } from "../../utils/url-data";
import { NewVideo, fetchCaptionEntries } from "../../utils/youtube";

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

// TODO: use pre-downloaded fixture
const NEW_VIDEOS: NewVideo[] = [
  {
    videoId: "_2FF6O6Z8Hc",
    language1: { id: ".fr-FR" },
    language2: { id: ".en" },
  },
  {
    videoId: "MoH8Fk2K9bc",
    language1: { id: ".fr-FR" },
    language2: { id: ".en" },
  },
  {
    videoId: "EnPYXckiUVg",
    language1: { id: ".fr" },
    language2: { id: ".en" },
  },
];

export function useVideo(type: 0 | 1 | 2 = 2) {
  const newVideo = NEW_VIDEOS[type];
  let result: { video: VideoTable; captionEntries: CaptionEntryTable[] };

  beforeAll(async () => {
    const data = await fetchCaptionEntries(newVideo);
    const videoId = await insertVideoAndCaptionEntries(newVideo, data);
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

// TODO: jest/vitest doesn't serialize `before` hooks, so we cannot simply combine `useUser` and `useVideo`
export function useUserVideo(
  type: 0 | 1 | 2 = 2,
  ...args: Parameters<typeof useUserImpl>
) {
  const { before, after } = useUserImpl(...args);

  let user: UserTable;
  let cookie: string;
  let video: VideoTable;
  let captionEntries: CaptionEntryTable[];
  const newVideo = NEW_VIDEOS[type];

  beforeAll(async () => {
    user = await before();
    cookie = await createUserCookie(user);

    const data = await fetchCaptionEntries(newVideo);
    const videoId = await insertVideoAndCaptionEntries(newVideo, data, user.id);
    const result = await getVideoAndCaptionEntries(videoId);
    tinyassert(result);
    video = result.video;
    captionEntries = result.captionEntries;
  });

  afterAll(async () => {
    await after();
    await db.delete(T.videos).where(E.eq(T.videos.id, video.id));
  });

  function signin(request: Request): Request {
    request.headers.set("cookie", cookie);
    return request;
  }

  return {
    user: () => user,
    video: () => video,
    captionEntries: () => captionEntries,
    signin,
  };
}
