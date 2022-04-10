export interface CaptionConfig {
  id: string;
  translation?: string;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  author: string;
  channelId: string;
}

// aka. youtube player response
export type VideoMetadata = {
  playabilityStatus: {
    status: "OK" | "ERROR";
  };
  videoDetails: VideoDetails;
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: {
        baseUrl: string;
        vssId: string;
        languageCode: string;
        kind?: string;
      }[];
    };
  };
};

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
