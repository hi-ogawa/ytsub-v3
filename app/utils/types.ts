import { z } from "zod";

export const Z_VIDEO_METADATA = z.object({
  playabilityStatus: z.object({
    status: z.string(), // OK, ERROR
  }),
  videoDetails: z.object({
    videoId: z.string(),
    title: z.string(),
    author: z.string(),
    channelId: z.string(),
  }),
  captions: z.object({
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
  }),
});

export type VideoMetadata = z.infer<typeof Z_VIDEO_METADATA>;

export type VideoDetails = VideoMetadata["videoDetails"];

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
