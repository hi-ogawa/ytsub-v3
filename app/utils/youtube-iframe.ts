import { newPromiseWithResolvers, once, tinyassert } from "@hiogawa/utils";
import { useRefCallbackEffect, useStableCallback } from "@hiogawa/utils-react";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { toast } from "react-hot-toast";
import { loadScript } from "./dom-utils";

//
// youtube iframe helper https://developers.google.com/youtube/iframe_api_reference
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
  getPlaybackRate: () => number;
  setPlaybackRate: (suggestedRate: number) => void;
  getAvailablePlaybackRates: () => number[];
  destroy: () => void;
}

// singleton
let youtubeIframeApi: YoutubeIframeApi;

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
  { onReady }: { onReady: (player: YoutubePlayer) => void }
) {
  onReady = useStableCallback(onReady);

  const ref = useRefCallbackEffect<HTMLElement>((el) => {
    if (el && mutation.isIdle) {
      mutation.mutate(el);
    }
  });

  const mutation = useMutation(
    (el: HTMLElement) => loadYoutubePlayer(el, playerOptions),
    {
      onSuccess: onReady,
      onError: () => {
        toast.error("Failed to initialize youtube player");
      },
    }
  );

  React.useEffect(() => {
    return () => mutation.data?.destroy();
  }, []);

  return {
    ref,
    isLoading: !mutation.isSuccess,
  };
}
