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

export const DUMMY_VIDEO_METADATA: VideoMetadata = {
  videoDetails: {
    videoId: "(videoId)",
    title: "(title)",
    author: "(author)",
    channelId: "(channelId)",
  },
  playabilityStatus: {
    status: "OK",
    playableInEmbed: true,
  },
  captions: {
    playerCaptionsTracklistRenderer: { captionTracks: [] },
  },
};

export type VideoMetadata = z.infer<typeof Z_VIDEO_METADATA>;

export interface CaptionConfig {
  id: string;
  translation?: string;
}

export interface CaptionConfigOption {
  name: string;
  captionConfig: CaptionConfig;
}

export interface CaptionConfigOptions {
  captions: CaptionConfigOption[];
  translationGroups: {
    name: string;
    translations: CaptionConfigOption[];
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
