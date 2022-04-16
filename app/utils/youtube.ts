import { XMLParser } from "fast-xml-parser";
import { maxBy, memoize, sortBy } from "lodash";
import { z } from "zod";
import { AppError } from "./errors";
import {
  FILTERED_LANGUAGE_CODES,
  LANGUAGE_CODE_TO_NAME,
  LanguageCode,
  languageCodeToName,
} from "./language";
import {
  CaptionConfig,
  CaptionConfigOptions,
  CaptionEntry,
  VideoMetadata,
} from "./types";

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

// TODO: caching
export async function fetchVideoMetadata(
  videoId: string
): Promise<VideoMetadata> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url, { headers: { "accept-language": "en" } });
  if (res.ok) {
    return parseVideoMetadata(await res.text());
  }
  throw new Error();
}

export function parseVideoMetadata(html: string): VideoMetadata {
  // cf. https://github.com/ytdl-org/youtube-dl/blob/a7f61feab2dbfc50a7ebe8b0ea390bd0e5edf77a/youtube_dl/extractor/youtube.py#L283
  const match = html.match(/var ytInitialPlayerResponse = ({.+?});/);
  if (match && match[1]) {
    return JSON.parse(match[1]);
  }
  throw new Error();
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

export function captionConfigToUrl(
  captionConfig: CaptionConfig,
  videoMetadata: VideoMetadata
): string | undefined {
  const { id: vssId, translation } = captionConfig;
  const { captionTracks } =
    videoMetadata.captions.playerCaptionsTracklistRenderer;
  const track = captionTracks.find((track) => track.vssId === vssId);
  if (track) {
    let url = track.baseUrl + "&fmt=ttml";
    if (translation) {
      url += "&tlang=" + translation;
    }
    return url;
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
  [code1, code2]: [LanguageCode, LanguageCode]
): [CaptionConfig | undefined, CaptionConfig | undefined] {
  const found1 = findCaptionConfig(videoMetadata, code1);
  let found2 = findCaptionConfig(videoMetadata, code2);
  if (found1 && !found2) {
    found2 = { ...found1, translation: code2 };
  }
  return [found1, found2];
}

export function guessLanguage(
  videoMetadata: VideoMetadata
): string | undefined {
  const { keywords = [] } = videoMetadata.videoDetails;
  const { captionTracks } =
    videoMetadata.captions.playerCaptionsTracklistRenderer;
  const counts: Record<string, number> = {};
  for (const [k, v] of Object.entries(LANGUAGE_CODE_TO_NAME)) {
    let count = 0;
    for (const keyword of keywords) {
      if (keyword.includes(v)) {
        count++;
      }
    }
    for (const captionTrack of captionTracks) {
      if (k === captionTrack.languageCode.slice(0, 2)) {
        count++;
      }
    }
    counts[k] = count;
  }
  const found = maxBy(Object.entries(counts), ([, count]) => count);
  if (found) return found[0];
  return;
}

export function ttmlToEntries(
  ttml: string
): { begin: number; end: number; text: string }[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    alwaysCreateTextNode: true,
  });

  // Replace "<br/>" elements with " "
  const sanitized = ttml.replace(/<br \/>/g, " ");

  // TODO: Validate
  interface Parsed {
    tt: {
      body: {
        div: {
          p: {
            "@_begin": string;
            "@_end": string;
            "#text": string;
          }[];
        };
      };
    };
  }
  const parsed: Parsed = parser.parse(sanitized);

  return parsed.tt.body.div.p.map((p) => ({
    begin: parseTimestamp(p["@_begin"]),
    end: parseTimestamp(p["@_end"]),
    // TODO: normalize white spaces (e.g. \u00a0)?
    text: p["#text"],
  }));
}

export function ttmlsToCaptionEntries(
  ttml1: string,
  ttml2: string
): CaptionEntry[] {
  const entries1 = ttmlToEntries(ttml1);
  const entries2 = ttmlToEntries(ttml2);
  return entries1.map(({ begin, end, text }, index) => {
    const e2 = sortBy(entries2, (e2) => Math.abs(e2.begin - begin))[0];
    return {
      index,
      begin,
      end,
      text1: text,
      text2: e2?.text ?? "",
    };
  });
}

export function parseTimestamp(text: string): number {
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

export const NEW_VIDEO_SCHEMA = z.object({
  videoId: z.string().length(11),
  language1: z.object({
    id: z.string(),
    translation: z
      .string()
      .optional()
      .transform((s) => s || undefined), // ignore empty string from html form
  }),
  language2: z.object({
    id: z.string(),
    translation: z
      .string()
      .optional()
      .transform((s) => s || undefined),
  }),
});

export type NewVideo = z.infer<typeof NEW_VIDEO_SCHEMA>;

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
  if (!url1) throw new AppError("Caption not found", language1);
  if (!url2) throw new AppError("Caption not found", language2);
  const [ttml1, ttml2] = await Promise.all([
    fetch(url1).then((res) => res.text()),
    fetch(url2).then((res) => res.text()),
  ]);
  const captionEntries = ttmlsToCaptionEntries(ttml1, ttml2);
  return { videoMetadata, captionEntries };
}

//
// Youtube Iframe API wrapper
//

export type YoutubePlayerOptions = {
  videoId: string;
  height?: number;
  width?: number;
  playerVars?: {
    autoplay?: 0 | 1;
    start?: number; // must be integer
  };
};

export type YoutubeIframeApi = {
  Player: new (...args: any[]) => YoutubePlayer;
};

export interface YoutubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (second: number) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
}

// The script https://www.youtube.com/iframe_api is self-modifying,
// so it would cause hydration mismatch if it's simply rendered via `<script src="https://www.youtube.com/iframe_api" />`
// since the modified `script` appears after SSR and before HYDRATE.
function _loadYoutubeIframeApi(): Promise<YoutubeIframeApi> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = "https://www.youtube.com/iframe_api";
    el.async = true;
    el.addEventListener("load", () => {
      const { YT } = window as any;
      YT.ready(() => resolve(YT));
    });
    el.addEventListener("error", reject);
    document.body.appendChild(el);
  });
}

export const loadYoutubeIframeApi = memoize(_loadYoutubeIframeApi);
