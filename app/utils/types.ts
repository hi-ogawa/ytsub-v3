import { z } from "zod";

export const Z_VIDEO_METADATA = z.object({
  // invalid video id returns empty `videoDetails`
  videoDetails: z.object({
    videoId: z.string(),
    title: z.string(),
    author: z.string(),
    channelId: z.string(),
  }),
  captions: z
    .object({
      playerCaptionsTracklistRenderer: z.object({
        captionTracks: z
          .object({
            baseUrl: z.string(),
            vssId: z.string(),
            languageCode: z.string(),
            kind: z.string().optional(),
          })
          .array(),
      }),
    })
    // allow loading a video without captions, but show a special error message in /vides/new page
    .default({ playerCaptionsTracklistRenderer: { captionTracks: [] } }),
});

export type VideoMetadata = z.infer<typeof Z_VIDEO_METADATA>;

export interface CaptionConfig {
  id: string;
  translation?: string;
}

export interface CaptionConfigOptions {
  captions: {
    name: string;
    captionConfig: CaptionConfig;
  }[];
  translationGroups: {
    name: string;
    translations: {
      name: string;
      captionConfig: CaptionConfig;
    }[];
  }[];
}

export interface CaptionEntry {
  index: number;
  begin: number;
  end: number;
  text1: string;
  text2: string;
}
