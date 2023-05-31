import { z } from "zod";

export const Z_VIDEO_METADATA = z.object({
  // invalid video id returns empty `videoDetails`
  videoDetails: z.object({
    videoId: z.string(),
    title: z.string(),
    author: z.string(),
    channelId: z.string(),
  }),
  playabilityStatus: z.object({
    status: z.string(),
    // some videos don't allow iframe playback https://github.com/hi-ogawa/ytsub-v3/issues/364
    playableInEmbed: z.boolean(),
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

export const Z_CAPTION_ENTRY = z.object({
  index: z.number(),
  begin: z.number(),
  end: z.number(),
  text1: z.string(),
  text2: z.string(),
});

export type CaptionEntry = z.infer<typeof Z_CAPTION_ENTRY>;
