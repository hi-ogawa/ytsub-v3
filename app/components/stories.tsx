import { Transition } from "@headlessui/react";
import React from "react";
import { cls } from "../utils/misc";
import { VideoComponent } from "./misc";
import { PopoverSimple } from "./popover";
import { PracticeHistoryChart } from "./practice-history-chart";

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

export function StoryPagination() {
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
  const [isLoading, setIsLoading] = React.useState(true);

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
            <button className="antd-btn antd-btn-text antd-floating w-12 h-12 rounded-full flex justify-center items-center">
              <span className="i-ri-close-line w-6 h-6" />
            </button>
          </Transition>
        </div>
      </div>
    </div>
  );
}

export function TestSpinner() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-2 gap-2">
        <div className="antd-spin w-10" />
        <div className="antd-spin w-20" />
        <div className="antd-spin w-40" />
      </div>
    </div>
  );
}

export function TestPracticeHistoryChart() {
  const data = [
    { date: "2022-05-08", total: 10, NEW: 3, LEARN: 4, REVIEW: 3 },
    { date: "2022-05-09", total: 9, NEW: 2, LEARN: 5, REVIEW: 2 },
    { date: "2022-05-10", total: 16, NEW: 7, LEARN: 6, REVIEW: 3 },
    { date: "2022-05-11", total: 18, NEW: 5, LEARN: 8, REVIEW: 5 },
    { date: "2022-05-12", total: 18, NEW: 8, LEARN: 7, REVIEW: 3 },
    { date: "2022-05-13", total: 14, NEW: 2, LEARN: 5, REVIEW: 7 },
    { date: "2022-05-14", total: 18, NEW: 5, LEARN: 8, REVIEW: 5 },
  ];
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg">
        <PracticeHistoryChart data={data} className="h-[300px] w-full" />
      </div>
    </div>
  );
}
