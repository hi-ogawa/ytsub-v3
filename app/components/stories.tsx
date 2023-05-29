import { Transition } from "@headlessui/react";
import { toArraySetState, useRafLoop } from "@hiogawa/utils-react";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { cls, zipMax } from "../utils/misc";
import {
  YoutubePlayer,
  parseVideoId,
  stringifyTimestamp,
  usePlayerLoader,
} from "../utils/youtube";
import { SelectWrapper, VideoComponent, transitionProps } from "./misc";
import { useModal } from "./modal";
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
  const videoIdInputForm = useForm({ defaultValues: { videoId: "" } });
  <form
    className="flex items-center m-0"
    onSubmit={videoIdInputForm.handleSubmit((data) => {
      const videoId = parseVideoId(data.videoId);
      videoId;
    })}
  >
    <input
      className="inline antd-input p-1"
      placeholder="Input Video ID or URL"
      {...videoIdInputForm.register("videoId", { required: true })}
    />
  </form>;

  return <CaptionEditor videoId="UY3N52CrTPE" />;
}

// TODO: virtualize list? (since it's not used for too long video, so it's fine)
// TODO: save draft in localstorage?
function CaptionEditor(props: { videoId: string }) {
  const [player, setPlayer] = React.useState<YoutubePlayer>();

  const { ref, isLoading } = usePlayerLoader(
    { videoId: props.videoId },
    { onReady: setPlayer }
  );

  const [entries, setEntries] = React.useState<CaptionEditorEntry[]>([]);

  const setEntriesExtra = toArraySetState(setEntries);

  function setEntry(
    i: number,
    action: (e: CaptionEditorEntry) => CaptionEditorEntry
  ) {
    const e = entries.at(i);
    if (e) {
      setEntriesExtra.splice(i, 1, action(e));
    }
  }

  function insertEntry(i: number, side: 1 | 2) {
    setEntries((entries) => {
      return entries.map((e, j) => {
        e = { ...e };
        if (j >= i) {
          if (side === 1) {
            e.text1 = (j > i && entries.at(j - 1)?.text1) || "";
          } else {
            e.text2 = (j > i && entries.at(j - 1)?.text2) || "";
          }
        }
        return e;
      });
    });
  }

  function deleteEntry(i: number, side: 1 | 2) {
    setEntries((entries) => {
      return entries.map((e, j) => {
        e = { ...e };
        if (j >= i) {
          if (side === 1) {
            e.text1 = entries.at(j + 1)?.text1 ?? "";
          } else {
            e.text2 = entries.at(j + 1)?.text2 ?? "";
          }
        }
        return e;
      });
    });
  }

  const exportEntriesMutation = useMutation({
    mutationFn: async () => {
      const output = JSON.stringify(entries, null, 2);
      await navigator.clipboard.writeText(output);
    },
    onSuccess: () => {
      toast.success("Copied captions data to clipboard!");
    },
  });

  const importModal = useModal();

  return (
    <div className="h-full flex flex-col items-center h-full">
      <div className="h-full w-full flex gap-2">
        <div className="flex-1 flex flex-col gap-2">
          <div className="relative pt-[56.2%]">
            <div className="absolute top-0 w-full h-full" ref={ref} />
            <Transition
              show={isLoading}
              className="duration-500 antd-body antd-spin-overlay-30"
              {...transitionProps("opacity-0", "opacity-100")}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              className="atnd-btn antd-btn-default px-3"
              onClick={() => importModal.setOpen(true)}
            >
              Import
            </button>
            <button
              className="atnd-btn antd-btn-default px-3"
              onClick={() => exportEntriesMutation.mutate()}
            >
              Export
            </button>
          </div>
          <importModal.Wrapper className="!max-w-3xl">
            <div className="flex flex-col max-h-[80vh]">
              <ImportModalForm
                onSubmit={(data) => {
                  setEntries(createInitialEntries(data.text1, data.text2));
                  importModal.setOpen(false);
                }}
              />
            </div>
          </importModal.Wrapper>
        </div>
        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="border p-2 flex-[1_0_0] h-full overflow-y-auto">
            <div className="flex-1 flex flex-col gap-2">
              {entries.map((e, i) => (
                <div
                  key={i}
                  className="border flex flex-col gap-1.5 p-1 text-sm"
                >
                  <div className="flex items-center gap-2.5 px-1">
                    <button
                      className="antd-btn antd-btn-ghost i-ri-play-line w-4 h-4"
                      onClick={() => {
                        if (!player) return;
                        player.seekTo(e.begin);
                      }}
                    ></button>
                    <div className="flex items-center gap-1.5">
                      <button
                        className="antd-btn antd-btn-ghost i-ri-time-line w-4 h-4"
                        onClick={() => {
                          if (!player) return;
                          const time = player.getCurrentTime();
                          setEntry(i, (e) => ({ ...e, begin: time }));
                          setEntry(i - 1, (e) =>
                            e.endLocked ? { ...e, end: time } : e
                          );
                        }}
                      ></button>
                      <span>{stringifyTimestamp(e.begin)}</span>
                    </div>
                    <span>-</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        className="antd-btn antd-btn-ghost i-ri-time-line w-4 h-4"
                        disabled={e.endLocked}
                        onClick={() => {
                          if (!player) return;
                          const time = player.getCurrentTime();
                          setEntry(i, (e) => ({ ...e, end: time }));
                        }}
                      ></button>
                      {stringifyTimestamp(e.end)}
                      <button
                        className={cls(
                          "antd-btn antd-btn-ghost w-4 h-4",
                          e.endLocked
                            ? "i-ri-lock-password-line"
                            : "i-ri-lock-unlock-line"
                        )}
                        onClick={() => {
                          setEntry(i, (e) => ({
                            ...e,
                            endLocked: !e.endLocked,
                          }));
                        }}
                      ></button>
                    </div>
                  </div>
                  <div key={i} className="flex gap-1">
                    <div className="flex-1 p-0.5">
                      <textarea
                        className="antd-input w-full h-full p-0.5"
                        value={e.text1}
                        onChange={(ev) => {
                          const text1 = ev.target.value;
                          setEntry(i, (e) => ({ ...e, text1 }));
                        }}
                        onKeyDown={(ev) => {
                          if (ev.ctrlKey && ev.key === "Enter") {
                            insertEntry(i, 1);
                          }
                          if (ev.ctrlKey && ev.key === "d") {
                            deleteEntry(i, 1);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 p-0.5">
                      <textarea
                        className="antd-input w-full h-full p-0.5"
                        value={e.text2}
                        onChange={(ev) => {
                          const text2 = ev.target.value;
                          setEntry(i, (e) => ({ ...e, text2 }));
                        }}
                        onKeyDown={(ev) => {
                          if (ev.ctrlKey && ev.key === "Enter") {
                            insertEntry(i, 2);
                          }
                          if (ev.ctrlKey && ev.key === "d") {
                            deleteEntry(i, 2);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function createInitialEntries(
  text1: string,
  text2: string
): CaptionEditorEntry[] {
  return zipMax(parseCaptionInput(text1), parseCaptionInput(text2)).map(
    ([text1 = "", text2 = ""]) => ({
      begin: 0,
      end: 0,
      endLocked: true,
      text1,
      text2,
    })
  );
}

interface ImportModalFormType {
  text1: string;
  text2: string;
}

function ImportModalForm(props: {
  onSubmit: (data: ImportModalFormType) => void;
}) {
  const form = useForm<ImportModalFormType>({
    defaultValues: {
      text1: "",
      text2: "",
    },
  });

  return (
    <form
      className="flex flex-col gap-4 p-4 m-0"
      onSubmit={form.handleSubmit((data) => {
        props.onSubmit(data);
      })}
    >
      <div className="flex items-center">
        <h2 className="text-lg">Import Captions</h2>
        <span className="flex-1"></span>
        <button
          type="button"
          className="antd-btn antd-btn-default px-2"
          onClick={() => {
            props.onSubmit({ text1: EXAMPLE_KO, text2: EXAMPLE_EN });
          }}
        >
          use sample
        </button>
      </div>
      <div className="flex gap-2">
        <label className="flex-1 flex flex-col gap-1">
          Left
          <textarea
            className="antd-input p-1"
            rows={10}
            {...form.register("text1")}
          />
        </label>
        <label className="flex-1 flex flex-col gap-1">
          Right
          <textarea
            className="antd-input p-1"
            rows={10}
            {...form.register("text2")}
          />
        </label>
      </div>
      <button className="antd-btn antd-btn-primary p-1">Submit</button>
    </form>
  );
}

interface CaptionEditorEntry {
  begin: number;
  end: number;
  endLocked: boolean;
  text1: string;
  text2: string;
}

function parseCaptionInput(input: string): string[] {
  return input
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// copied from https://lyricstranslate.com/en/twice-say-something-lyrics.html
const EXAMPLE_KO = `\
매일이 별다를 것 없던
기억들이 변해가는 것 같아
Where are we 우린 어디쯤인 걸까 가끔은

맘이 기울어
I've been waiting for you (Two of us)
달이 기울면 I'm ready for you (Both of us)
아무런 예고 없이 다가온
그리 낯설지 않았던

느린 시간 속 심장은 빨라지고
이 도시의 빛이 꺼질 때쯤
아스라이 감은 눈을 뜨면
내 이름이 들려오는 이 순간에

Say something, say something
Say something, say something
Say something, say something
Say something, say something

늘 혼자 서 있는 가로등은
어느 누구를 기다리고 있을까
똑같은 표정의 불빛들이
오늘은 달라 보여서

맘이 기울어
I've been waiting for you (Two of us)
달이 기울면 I'm ready for you (Both of us)
변덕스러운 밤이 차가워지고
그만큼 낯설지 않았던

느린 시간 속 심장은 빨라지고
이 도시의 빛이 꺼질 때쯤
아스라이 감은 눈을 뜨면
내 이름이 들려오는 이 순간에

Say something, say something
Say something, say something
Say something, say something
Say something, say something

도시의 사각 틈 사이로
새어 나온 불빛 나를 감싸면
맘을 말해 줘

느린 시간 속 심장은 빨라지고 (빨라지고)
이 도시의 빛이 꺼질 때쯤 (빛이 꺼질 때쯤)
아스라이 감은 눈을 뜨면
내 이름이 들려오는 이 순간에

Say something (Say something)
Say something (Oh)
Say something (Nanananananana)
Say something
Say something (Oh)
Say something
Say something (Say something)
Say something
`;

const EXAMPLE_EN = `\
It will be different tomorrow
Are bad memories changing?
Where are we on the war? Sometimes

My heart is leaning
I've been waiting for you (Two of us)
When the moon tilts, I'm ready for you (Both of us)
Came without any notice
Still, it wasn't strange

My heart speeds up in slow time
By the time the city lights go out
When I open my closed eyes
At this moment when my name is heard

Say something, say something
Say something, say something
Say something, say something
Say something, say something

Street lights that always stand alone
One day will you be waiting for the clouds
The lights of the same expression
It looks different today

My heart is leaning
I've been waiting for you (Two of us)
When the moon tilts, I'm ready for you (Both of us)
My secret heart gets colder
That wasn't that strange

My heart speeds up in slow time
By the time this city light goes out
When I open my closed eyes
At this moment when my name is heard

Say something, say something
Say something, say something
Say something, say something
Say something, say something

Through the dawn of this city
When the leaked light wraps around me
Tell me your heart

My heart speeds up in slow time
By the time this city light goes out
When I open my closed eyes
At this moment when my name is heard

Say something (Say something)
Say something (Oh)
Say something (Nanananananana)
Say something
Say something (Oh)
Say something
Say something (Say something)
Say something
`;
