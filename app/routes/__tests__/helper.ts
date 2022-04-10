import { ActionFunction, LoaderFunction } from "@remix-run/server-runtime";
import { afterAll, beforeAll } from "vitest";
import {
  CaptionEntryTable,
  UserTable,
  VideoTable,
  filterNewVideo,
  getVideoAndCaptionEntries,
  insertVideoAndCaptionEntries,
} from "../../db/models";
import { assert } from "../../misc/assert";
import { useUserImpl } from "../../misc/helper";
import { createUserCookie } from "../../utils/auth";
import { toQuery } from "../../utils/url-data";
import { NewVideo, fetchCaptionEntries } from "../../utils/youtube";

const DUMMY_URL = "http://localhost:3000";

export function testLoader(
  loader: LoaderFunction,
  { query = {}, params = {} }: { query?: any; params?: Record<string, string> }
) {
  return loader({
    request: new Request(DUMMY_URL + "/?" + toQuery(query)),
    context: {},
    params,
  });
}

export function testAction(
  loader: ActionFunction,
  { data = {} }: { data?: any },
  preprocess: (request: Request) => Request = (request) => request
) {
  const request = new Request(DUMMY_URL, {
    method: "POST",
    body: toQuery(data),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
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

export function useVideo(type: 0 | 1 | 2 = 2, userId?: () => number) {
  const newVideo = NEW_VIDEOS[type];
  let result: { video: VideoTable; captionEntries: CaptionEntryTable[] };

  beforeAll(async () => {
    const id = userId?.();
    await filterNewVideo(newVideo, id).delete();

    const data = await fetchCaptionEntries(newVideo);
    const videoId = await insertVideoAndCaptionEntries(newVideo, data, id);
    const resultOption = await getVideoAndCaptionEntries(videoId);
    assert(resultOption);
    result = resultOption;
  });

  afterAll(async () => {
    await filterNewVideo(newVideo, userId?.()).delete();
  });

  return {
    video: () => result.video,
    captionEntries: () => result.captionEntries,
  };
}
