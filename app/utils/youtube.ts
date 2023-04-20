import { newPromiseWithResolvers, tinyassert } from "@hiogawa/utils";
import { UseMutationOptions, useMutation } from "@tanstack/react-query";
import { XMLParser } from "fast-xml-parser";
import { maxBy, once } from "lodash";
import React from "react";
import { z } from "zod";
import {
  FILTERED_LANGUAGE_CODES,
  LanguageCode,
  languageCodeToName,
} from "./language";
import { loadScript, throwGetterProxy } from "./misc";
import {
  CaptionConfig,
  CaptionConfigOptions,
  CaptionEntry,
  VideoMetadata,
  Z_VIDEO_METADATA,
} from "./types";

//
// youtube video detail scraping (based on https://github.com/hi-ogawa/youtube-dl-web-v2/blob/ca7c08ca6b144c235bdc4c7e307a0468052aa6fa/packages/app/src/utils/youtube-utils.ts#L46-L53)
//

export async function fetchVideoMetadata(videoId: string) {
  const response = await fetchVideoMetadataRaw(videoId);
  return Z_VIDEO_METADATA.parse(response);
}

// cf. https://gist.github.com/hi-ogawa/23f6d0b212f51c2b1b255339c642e9b9
async function fetchVideoMetadataRaw(videoId: string): Promise<any> {
  // prettier-ignore
  const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
    method: "POST",
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: "ANDROID",
          clientVersion: "17.31.35",
          androidSdkVersion: 30,
          hl: "en",
          timeZone: "UTC",
          utcOffsetMinutes: 0,
        },
      },
    }),
    headers: {
      "X-YouTube-Client-Name": "3",
      "X-YouTube-Client-Version": "17.31.35",
      "Origin": "https://www.youtube.com",
      "User-Agent": "com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip",
      "content-type": "application/json",
    }
  });
  tinyassert(res.ok);
  tinyassert(res.headers.get("content-type")?.startsWith("application/json"));
  return JSON.parse(await res.text());
}

//
// utils
//

export function parseVideoId(value: string): string | undefined {
  if (value.length === 11) {
    return value;
  }
  if (value.match(/youtube\.com|youtu\.be/)) {
    try {
      const url = new URL(value);
      if (url.hostname === "youtu.be") {
        return url.pathname.substring(1);
      } else {
        const videoId = url.searchParams.get("v");
        if (videoId) {
          return videoId;
        }
      }
    } catch {}
  }
  return;
}

export function toThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function parseVssId(vssId: string): LanguageCode {
  return vssId.split(".")[1].slice(0, 2) as LanguageCode;
}

export function toCaptionConfigOptions(
  videoMetadata: VideoMetadata
): CaptionConfigOptions {
  const { captionTracks } =
    videoMetadata.captions.playerCaptionsTracklistRenderer;

  const captions = captionTracks.map(({ vssId, languageCode, kind }) => ({
    name: languageCodeToName(languageCode, kind),
    captionConfig: { id: vssId },
  }));

  const translationGroups = captionTracks.map(
    ({ vssId, languageCode, kind }) => ({
      name: languageCodeToName(languageCode, kind),
      translations: FILTERED_LANGUAGE_CODES.map((code) => ({
        name: languageCodeToName(code),
        captionConfig: { id: vssId, translation: code },
      })),
    })
  );

  return { captions, translationGroups };
}

function captionConfigToUrl(
  captionConfig: CaptionConfig,
  videoMetadata: VideoMetadata
): string | undefined {
  const { id: vssId, translation } = captionConfig;
  const { captionTracks } =
    videoMetadata.captions.playerCaptionsTracklistRenderer;
  const track = captionTracks.find((track) => track.vssId === vssId);
  if (track) {
    const url = new URL(track.baseUrl);
    url.searchParams.set("fmt", "ttml");
    if (translation) {
      url.searchParams.set("tlang", translation);
    }
    return String(url);
  }
  return;
}

function findCaptionConfig(
  videoMetadata: VideoMetadata,
  code: LanguageCode
): CaptionConfig | undefined {
  const { captionTracks } =
    videoMetadata.captions.playerCaptionsTracklistRenderer;

  // Manual caption
  let manual = captionTracks.find(({ vssId }) => vssId.startsWith("." + code));
  if (manual) {
    return { id: manual.vssId };
  }

  // Machine speech recognition capion
  let machine = captionTracks.find(({ vssId }) =>
    vssId.startsWith("a." + code)
  );
  if (machine) {
    return { id: machine.vssId };
  }
  return;
}

export function findCaptionConfigPair(
  videoMetadata: VideoMetadata,
  { code1, code2 }: { code1: LanguageCode; code2: LanguageCode }
) {
  const language1 = findCaptionConfig(videoMetadata, code1);
  let language2 = findCaptionConfig(videoMetadata, code2);
  if (language1 && !language2) {
    language2 = { ...language1, translation: code2 };
  }
  return { language1, language2 };
}

interface TtmlEntry {
  begin: number;
  end: number;
  text: string;
}

export function ttmlToEntries(ttml: string): TtmlEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    alwaysCreateTextNode: true,
  });

  // Replace "<br/>" elements with " "
  const sanitized = ttml.replaceAll("<br />", " ");

  // TODO: Validate
  interface Parsed {
    tt: {
      body: {
        div: {
          p: {
            "@_begin": string;
            "@_end": string;
            "#text"?: string;
          }[];
        };
      };
    };
  }
  const parsed: Parsed = parser.parse(sanitized);

  return parsed.tt.body.div.p
    .map((p) => ({
      begin: parseTimestamp(p["@_begin"]),
      end: parseTimestamp(p["@_end"]),
      // TODO: normalize white spaces (e.g. \u00a0)?
      text: p["#text"] ?? "",
    }))
    .filter((e) => e.text);
}

export function ttmlsToCaptionEntries(
  ttml1: string,
  ttml2: string
): CaptionEntry[] {
  const entries1 = ttmlToEntries(ttml1);
  const entries2 = ttmlToEntries(ttml2);
  return mergeTtmlEntries(entries1, entries2);
}

function mergeTtmlEntries(
  entries1: TtmlEntry[],
  entries2: TtmlEntry[]
): CaptionEntry[] {
  return entries1.map((e1, index) => {
    const isects = entries2
      .map((e2) => [e2, computeIntersection(e1, e2)] as const)
      .filter(([, isect]) => isect > 0);
    const candidates = isects.filter(([, isect]) => isect >= 2);
    let text2 = "";
    if (candidates.length > 0) {
      // Merge all entries with overlap >= 2s
      text2 = candidates.map(([e2]) => e2.text).join("");
    } else if (isects.length > 0) {
      // Or take maximum overlap
      text2 = maxBy(isects, ([, isect]) => isect)![0].text;
    }
    return {
      index,
      begin: e1.begin,
      end: e1.end,
      text1: e1.text,
      text2,
    };
  });
}

function computeIntersection(e1: TtmlEntry, e2: TtmlEntry): number {
  // length of intersection of [begin, end] intervals
  const left = Math.max(e1.begin, e2.begin);
  const right = Math.min(e1.end, e2.end);
  return Math.max(right - left, 0);
}

function parseTimestamp(text: string): number {
  const [h, m, s] = text.split(":").map(Number);
  return (h * 60 + m) * 60 + s;
}

export function stringifyTimestamp(s: number): string {
  let ms = (s * 1000) % 1000;
  let m = s / 60;
  s = s % 60;
  let h = m / 60;
  m = m % 60;

  // printf "%0Nd"
  function D(x: number, N: number) {
    return String(Math.floor(x)).padStart(N, "0");
  }

  return `${D(h, 2)}:${D(m, 2)}:${D(s, 2)}.${D(ms, 3)}`;
}

export const Z_NEW_VIDEO = z.object({
  videoId: z.string().length(11),
  language1: z.object({
    id: z.string(),
    translation: z.string().optional(),
  }),
  language2: z.object({
    id: z.string(),
    translation: z.string().optional(),
  }),
});

export type NewVideo = z.infer<typeof Z_NEW_VIDEO>;

export async function fetchCaptionEntries({
  videoId,
  language1,
  language2,
}: NewVideo): Promise<{
  videoMetadata: VideoMetadata;
  captionEntries: CaptionEntry[];
}> {
  const videoMetadata = await fetchVideoMetadata(videoId);
  const url1 = captionConfigToUrl(language1, videoMetadata);
  const url2 = captionConfigToUrl(language2, videoMetadata);
  tinyassert(url1);
  tinyassert(url2);
  const ttmls = [url1, url2].map(async (url) => {
    const res = await fetch(url);
    tinyassert(res.ok);
    return res.text();
  });
  const [ttml1, ttml2] = await Promise.all(ttmls);
  const captionEntries = ttmlsToCaptionEntries(ttml1, ttml2);
  return { videoMetadata, captionEntries };
}

//
// Youtube Iframe API wrapper https://developers.google.com/youtube/iframe_api_reference
//

export type YoutubePlayerOptions = {
  videoId: string;
  height?: number;
  width?: number;
  // https://developers.google.com/youtube/player_parameters#Parameters
  playerVars?: {
    start?: number; // must be integer
  };
};

type YoutubeIframeApi = {
  ready: (callback: () => void) => void;
  Player: new (...args: any[]) => YoutubePlayer;
};

export interface YoutubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (second: number) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
}

// singleton
let youtubeIframeApi: YoutubeIframeApi = throwGetterProxy as any;

const loadYoutubeIframeApi = once(async () => {
  tinyassert(typeof window !== "undefined");

  // load external <script>
  await loadScript("https://www.youtube.com/iframe_api");
  youtubeIframeApi = (window as any).YT as YoutubeIframeApi;

  // wait for api ready callback
  const { promise, resolve } = newPromiseWithResolvers<void>();
  youtubeIframeApi.ready(() => resolve());
  await promise;
});

async function loadYoutubePlayer(
  el: HTMLElement,
  options: YoutubePlayerOptions
): Promise<YoutubePlayer> {
  await loadYoutubeIframeApi();

  const { promise, resolve } = newPromiseWithResolvers<void>();
  const player = new youtubeIframeApi.Player(el, {
    ...options,
    events: { onReady: () => resolve() },
  });
  await promise;

  return player;
}

export function usePlayerLoader(
  playerOptions: YoutubePlayerOptions,
  mutationOptions: UseMutationOptions<
    YoutubePlayer,
    unknown,
    HTMLElement,
    unknown
  >
) {
  // TODO: cleanup resource on unmount?

  const ref: React.RefCallback<HTMLElement> = (el) => {
    if (el) {
      mutation.mutate(el);
    }
  };

  const mutation = useMutation(
    (el: HTMLElement) => loadYoutubePlayer(el, playerOptions),
    mutationOptions
  );

  return {
    ref: React.useCallback(ref, []),
    isLoading: !mutation.isSuccess,
  };
}
