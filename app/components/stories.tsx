import { Transition } from "@headlessui/react";
import React from "react";
import { Bookmark, Save, Trash2 } from "react-feather";
import { useToggle } from "react-use";
import { cls } from "../utils/misc";
import { Spinner, VideoComponent } from "./misc";
import { PopoverSimple } from "./popover";
import { PracticeHistoryChart } from "./practice-history-chart";

export function TestMenu() {
  const [state, setState] = React.useState(true);

  return (
    <div className="p-4 flex flex-col items-center">
      <ul className="flex flex-col gap-2 p-3 w-[200px] bg-colorBgElevated shadow-[var(--antd-boxShadowSecondary)]">
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
                  context.open &&
                    "text-colorPrimaryActive border-colorPrimaryActive"
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
  const [isLoading, toggle] = useToggle(true);

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col p-2 gap-2">
        <label className="label flex justify-start gap-4 items-center">
          <input
            className="toggle"
            type="checkbox"
            checked={isLoading}
            onChange={() => toggle()}
          />
          <span className="label-text">Toggle loading</span>
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
                <button>
                  <Save />
                  Save
                </button>
              </li>
              <li>
                <button>
                  <Trash2 />
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
      <div className="w-full max-w-lg flex flex-col p-2 gap-2">
        <div>
          <input
            className="toggle"
            type="checkbox"
            checked={checked}
            onChange={() => setChecked(!checked)}
          />
        </div>
        <div className="w-80 h-80 border relative">
          <Transition
            show={checked}
            className="absolute flex gap-3 p-3 transition-all duration-300"
            enterFrom="scale-[0.3] opacity-0"
            enterTo="scale-100 opacity-100"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-[0.3] opacity-0"
          >
            <button className="w-12 h-12 rounded-full bg-primary text-primary-content flex justify-center items-center shadow-lg hover:contrast-[0.8] transition-[filter] duration-300">
              <Bookmark />
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
        <Spinner className="w-10 h-10" />
        <Spinner className="w-20 h-20" />
        <Spinner className="w-40 h-40" />
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
