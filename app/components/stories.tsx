import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { useRafLoop } from "@hiogawa/utils-react";
import React from "react";
import { useForm } from "react-hook-form";
import { cls } from "../utils/misc";
import { DUMMY_VIDEO_METADATA } from "../utils/types";
import { YoutubePlayer, usePlayerLoader } from "../utils/youtube";
import { CaptionEditor } from "./caption-editor";
import {
  STORAGE_KEYS,
  Z_CAPTION_EDITOR_ENTRY_LIST,
  useLocalStorage,
} from "./caption-editor-utils";
import { SelectWrapper, VideoComponent, transitionProps } from "./misc";
import { PopoverSimple } from "./popover";
import {
  EchartsComponent,
  practiceHistoryChartDataToEchartsOption,
} from "./practice-history-chart";

export function TestMenu() {
  const [state, setState] = React.useState(true);

  return (
    <div className="p-4 flex flex-col items-center">
      <ul className="flex flex-col gap-2 p-3 w-[200px] antd-floating">
        <li className="flex">
          <button className="antd-menu-item flex-1 p-2 flex">
            Change languages
          </button>
        </li>
        <li className="flex">
          <button
            className="antd-menu-item flex-1 p-2 flex gap-2"
            onClick={() => setState(!state)}
          >
            <span>Auto scroll</span>
            {state && <span className="i-ri-check-line w-5 h-5"></span>}
          </button>
        </li>
      </ul>
    </div>
  );
}

export function TestPagination() {
  const page = 1;
  const totalPage = 3;
  const total = 25;

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="flex flex-col gap-2 p-3 border">
        <div className="flex items-center gap-2">
          <button className="antd-btn antd-btn-ghost flex items-center">
            <span className="i-ri-rewind-mini-fill w-5 h-5"></span>
          </button>
          <button className="antd-btn antd-btn-ghost flex items-center">
            <span className="i-ri-play-mini-fill w-4 h-4 rotate-[180deg]"></span>
          </button>
          <span className="text-sm">
            {page} / {totalPage} ({total})
          </span>
          <button className="antd-btn antd-btn-ghost flex items-center">
            <span className="i-ri-play-mini-fill w-4 h-4"></span>
          </button>
          <button className="antd-btn antd-btn-ghost flex items-center">
            <span className="i-ri-rewind-mini-fill w-5 h-5 rotate-[180deg]"></span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function TestPopover() {
  return (
    <div className="p-4 flex flex-col items-center">
      <div className="border w-full max-w-sm p-4 flex flex-col gap-2">
        <div>
          <PopoverSimple
            placement="bottom-end"
            reference={(context) => (
              <button
                className={cls(
                  "antd-btn antd-btn-ghost flex items-center",
                  context.open && "text-colorPrimaryActive"
                )}
              >
                <span className="i-ri-user-line w-6 h-6"></span>
              </button>
            )}
            floating={
              <ul className="flex flex-col gap-2 p-3 w-[200px]">
                <li className="flex">
                  <button className="flex-1 antd-menu-item p-2 flex items-center gap-3">
                    <span className="i-ri-settings-line w-5 h-5"></span>
                    Account
                  </button>
                </li>
                <li className="flex">
                  <button className="flex-1 antd-menu-item p-2 flex items-center gap-3">
                    <span className="i-ri-logout-circle-line w-5 h-5"></span>
                    Sign out
                  </button>
                </li>
              </ul>
            }
          />
        </div>
      </div>
    </div>
  );
}

export function TestVideoComponent() {
  const [isLoading, setIsLoading] = React.useState(false);
  React.useEffect(() => setIsLoading(true), []);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-2 gap-2">
        <label className="flex justify-start gap-2 items-center">
          <input
            type="checkbox"
            checked={isLoading}
            onChange={() => setIsLoading(!isLoading)}
          />
          <span>Toggle loading</span>
        </label>
        <VideoComponent
          video={{
            title:
              "LEARN FRENCH IN 2 MINUTES – French idiom : Noyer le poisson",
            author: "Learn French with Elisabeth - HelloFrench",
            channelId: "UCo6iNXVDuG-SQlAdxAGPGHg",
            id: 0,
            videoId: "MoH8Fk2K9bc",
            language1_id: ".fr-FR",
            language2_id: ".en",
            language1_translation: null,
            language2_translation: null,
          }}
          actions={
            <>
              <li>
                <button className="w-full antd-menu-item flex-1 p-2 flex items-center gap-2">
                  <span className="i-ri-save-line w-5 h-5"></span>
                  Save
                </button>
              </li>
              <li>
                <button className="w-full antd-menu-item flex-1 p-2 flex items-center gap-2">
                  <span className="i-ri-delete-bin-line w-5 h-5"></span>
                  Delete
                </button>
              </li>
            </>
          }
        />
        <VideoComponent
          video={{
            title:
              "Russian Alphabet (How to Pronounce Russian Letters) | Super Easy Russian 60",
            author: "Easy Russian",
            channelId: "UCxvt-g7JsPNnEn8tUtZZBBg",
            id: 0,
            videoId: "FSYe9GQc9Ow",
            language1_id: ".ru",
            language2_id: ".en",
            language1_translation: null,
            language2_translation: null,
          }}
          bookmarkEntriesCount={17}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

export function TestFab() {
  const [checked, setChecked] = React.useState(true);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-2 gap-2 border">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => setChecked(!checked)}
          />
          <span>Show/Hide</span>
        </label>
        <div className="w-80 h-80 relative">
          <Transition
            show={checked}
            className="absolute flex gap-3 p-3 transition duration-300"
            enterFrom="scale-30 opacity-0"
            enterTo="scale-100 opacity-100"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-30 opacity-0"
          >
            <button className="antd-btn !antd-btn-primary antd-floating w-12 h-12 rounded-full flex justify-center items-center">
              <span className="i-ri-bookmark-line w-6 h-6" />
            </button>
            <button className="antd-btn antd-btn-text dark:bg-colorBgSpotlight antd-floating w-12 h-12 rounded-full flex justify-center items-center">
              <span className="i-ri-close-line w-6 h-6" />
            </button>
          </Transition>
        </div>
      </div>
    </div>
  );
}

export function TestSpinner() {
  const form = useForm({ defaultValues: { overlay: true, button: true } });

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-4 gap-4 border">
        <div className="flex flex-col gap-2">
          Simple
          <div className="flex justify-center gap-4">
            <div className="antd-spin h-4" />
            <div className="antd-spin h-8" />
            <div className="antd-spin h-12" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            Overlay
            <input type="checkbox" {...form.register("overlay")} />
          </div>
          <div className="relative border h-[100px] grid place-content-center">
            <div>Hello World</div>
            <Transition
              show={form.watch("overlay")}
              className="duration-500 antd-body antd-spin-overlay-12"
              {...transitionProps("opacity-0", "opacity-100")}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            Button
            <input type="checkbox" {...form.register("button")} />
          </div>
          <button
            className={cls(
              "antd-btn antd-btn-primary p-1",
              form.watch("button") && "antd-btn-loading"
            )}
            disabled={form.watch("button")}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function TestPracticeHistoryChart() {
  // prettier-ignore
  const data = [
    { date: "2022-05-08", total: 10, "queue-NEW": 3, "queue-LEARN": 4, "queue-REVIEW": 3 },
    { date: "2022-05-09", total: 9,  "queue-NEW": 2, "queue-LEARN": 5, "queue-REVIEW": 2 },
    { date: "2022-05-10", total: 16, "queue-NEW": 7, "queue-LEARN": 6, "queue-REVIEW": 3 },
    { date: "2022-05-11", total: 18, "queue-NEW": 5, "queue-LEARN": 8, "queue-REVIEW": 5 },
    { date: "2022-05-12", total: 18, "queue-NEW": 8, "queue-LEARN": 7, "queue-REVIEW": 3 },
    { date: "2022-05-13", total: 14, "queue-NEW": 2, "queue-LEARN": 5, "queue-REVIEW": 7 },
    { date: "2022-05-14", total: 18, "queue-NEW": 5, "queue-LEARN": 8, "queue-REVIEW": 5 },
  ];

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg">
        <EchartsComponent
          className="h-[300px] w-full"
          option={practiceHistoryChartDataToEchartsOption(data as any, "queue")}
        />
      </div>
    </div>
  );
}

export function TestYoutubePlayer() {
  const [player, setPlayer] = React.useState<YoutubePlayer>();

  const { ref, isLoading } = usePlayerLoader(
    // https://www.youtube.com/watch?v=AQt4K08L_m8
    { videoId: "AQt4K08L_m8" },
    { onReady: setPlayer }
  );

  const playbackRateOptions = player?.getAvailablePlaybackRates() ?? [1];
  const [playbackRate, setPlaybackRate] = React.useState(1);

  // sync state on animation frame
  useRafLoop(() => {
    setPlaybackRate(player?.getPlaybackRate() ?? 1);
  });

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-2">
        <div className="relative w-full max-w-md md:max-w-none">
          <div className="relative pt-[56.2%]">
            <div className="absolute top-0 w-full h-full" ref={ref} />
          </div>
          <Transition
            show={isLoading}
            className="duration-500 antd-body antd-spin-overlay-30"
            {...transitionProps("opacity-0", "opacity-100")}
          />
        </div>
        <div className="flex justify-end">
          <label className="flex items-center gap-2">
            <span>Speed</span>
            <SelectWrapper
              className="antd-input p-1 w-16"
              value={playbackRate}
              options={playbackRateOptions}
              onChange={(v) => player?.setPlaybackRate(v)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export function TestCaptionEditor() {
  // https://www.youtube.com/watch?v=UY3N52CrTPE
  const [videoId] = React.useState(
    () => new URLSearchParams(window.location.search).get("v") || "UY3N52CrTPE"
  );

  const [draftData = [], setDraftData] = useLocalStorage(
    Z_CAPTION_EDITOR_ENTRY_LIST,
    `${STORAGE_KEYS.captionEditorEntryListByVideoId}:${videoId}`
  );

  return (
    <CaptionEditor
      videoMetadata={DUMMY_VIDEO_METADATA}
      videoId={videoId}
      defaultValue={draftData}
      onChange={(data) => setDraftData(data)}
    />
  );
}
