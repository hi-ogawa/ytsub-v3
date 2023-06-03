import { Transition } from "@headlessui/react";
import { tinyassert, wrapError } from "@hiogawa/utils";
import {
  toArraySetState,
  useRafLoop,
  useStableCallback,
} from "@hiogawa/utils-react";
import { useMutation } from "@tanstack/react-query";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import { useDocumentEvent } from "../utils/hooks-client-utils";
import { cls, zipMax } from "../utils/misc";
import { useEffectNoStrict } from "../utils/misc-react";
import type { CaptionEntry } from "../utils/types";
import {
  YoutubePlayer,
  stringifyTimestamp,
  usePlayerLoader,
} from "../utils/youtube";
import { transitionProps } from "./misc";
import { useModal } from "./modal";

// TODO: virtualize list? (no perf problem when used for short 3 min song)
// TODO: save draft in localstorage?
// TODO: support "half manual" mode

export function CaptionEditor(props: { videoId: string }) {
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
      const formatted = entries
        .filter((e) => e.text1.trim() || e.text2.trim())
        .map(
          (e, index) =>
            ({
              ...e,
              index,
            } satisfies CaptionEntry)
        );
      const output = JSON.stringify(formatted, null, 2);
      await navigator.clipboard.writeText(output);
    },
    onSuccess: () => {
      toast.success("Caption data is copied to clipboard!");
    },
  });

  const importModal = useModal();

  //
  // sync player state on animation frame
  //
  const [currentEntries, setCurrentEntries] = React.useState<
    CaptionEditorEntry[]
  >([]);
  const currentEntriesSet = new Set(currentEntries);

  const [isPlaying, setIsPlayring] = React.useState(false);

  useRafLoop(() => {
    setCurrentEntries((prev) => {
      if (player) {
        const time = player.getCurrentTime();
        return entries.filter((e) => e.begin <= time && time < e.end);
      }
      return prev;
    });

    setIsPlayring(player?.getPlayerState() === 1);
  });

  //
  // same keyboard shortcut for youtube player
  //
  useDocumentEvent("keyup", (e) => {
    if (document.activeElement?.tagName === "TEXTAREA") {
      return;
    }

    if (!player) {
      return;
    }

    if (e.key === "k") {
      if (player.getPlayerState() === 1) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
    if (e.key === "j") {
      player.seekTo(player.getCurrentTime() - 10);
    }
    if (e.key === "l") {
      player.seekTo(player.getCurrentTime() + 10);
    }
    if (e.key === "ArrowLeft") {
      player.seekTo(player.getCurrentTime() - 5);
    }
    if (e.key === "ArrowRight") {
      player.seekTo(player.getCurrentTime() + 5);
    }
  });

  //
  // auto load/save in localstorage
  //
  const draft = createDraftUtils(props.videoId);
  const draftSet = useDebounce(draft.set, 300);

  // auto load on mount
  useEffectNoStrict(() => {
    tinyassert(entries.length === 0);
    const found = draft.get();
    if (found) {
      setEntries(found);
    }
  }, []);

  // auto save on change
  useEffectNoStrict(() => {
    if (entries.length > 0) {
      draftSet(entries);
    }
  }, [entries]);

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
                  className={cls(
                    "border flex flex-col gap-1 p-1 text-sm",
                    currentEntriesSet.has(e) && "border-colorPrimary",
                    currentEntriesSet.has(e) &&
                      isPlaying &&
                      "ring-2 ring-colorPrimaryBorder"
                  )}
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
                      <span className={cls(e.begin === 0 && "text-colorError")}>
                        {stringifyTimestamp(e.begin)}
                      </span>
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
                      <span
                        className={cls(e.begin >= e.end && "text-colorError")}
                      >
                        {stringifyTimestamp(e.end)}
                      </span>
                      <button
                        className={cls(
                          "antd-btn antd-btn-ghost w-3.5 h-3.5",
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
                    <div className="flex-1">
                      <textarea
                        className="antd-input w-full h-full p-1"
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
                    <div className="flex-1">
                      <textarea
                        className="antd-input w-full h-full p-1"
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

function createDraftUtils(key: string) {
  const draftKey = `ytsub:useDraft:${key}`;

  function get(): CaptionEditorEntry[] | undefined {
    const item = window.localStorage.getItem(draftKey);
    if (item) {
      const parsed = wrapError(() =>
        Z_CAPTION_EDITOR_ENTRY.array().parse(JSON.parse(item))
      );
      if (parsed.ok) {
        return parsed.value;
      }
      console.error("createDraftUtils", parsed.value);
    }
    return;
  }

  function set(data: CaptionEditorEntry[]) {
    const item = JSON.stringify(data);
    window.localStorage.setItem(draftKey, item);
  }

  return { get, set };
}

// TODO: utils
function debounce<F extends (...args: any[]) => void>(f: F, ms: number): F {
  let subscription: any;

  function wrapper(this: unknown, ...args: unknown[]) {
    if (typeof subscription !== "undefined") {
      clearTimeout(subscription);
    }
    subscription = setTimeout(() => f.apply(this, args), ms);
  }

  return wrapper as any;
}

// TODO: utils-react
function useDebounce<F extends (...args: any[]) => void>(f: F, ms: number) {
  // TODO: pending?
  f = useStableCallback(f);
  return React.useCallback(debounce(f, ms), [ms]);
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

const Z_CAPTION_EDITOR_ENTRY = z.object({
  begin: z.number(),
  end: z.number(),
  endLocked: z.boolean(),
  text1: z.string(),
  text2: z.string(),
});

type CaptionEditorEntry = z.infer<typeof Z_CAPTION_EDITOR_ENTRY>;

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
