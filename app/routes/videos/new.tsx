import { tinyassert, wrapPromise } from "@hiogawa/utils";
import { toArraySetState } from "@hiogawa/utils-react";
import { useNavigate } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { atom, useAtom } from "jotai";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { SelectWrapper } from "../../components/misc";
import { useModal } from "../../components/modal";
import { PopoverSimple } from "../../components/popover";
import type { UserTable } from "../../db/models";
import { $R, R, ROUTE_DEF } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import { toastInfo } from "../../utils/flash-message-hook";
import {
  FILTERED_LANGUAGE_CODES,
  LanguageCode,
  isLanguageCode,
  languageCodeToName,
} from "../../utils/language";
import { useLoaderDataExtra } from "../../utils/loader-utils";
import { makeLoader } from "../../utils/loader-utils.server";
import { cls, zipMax } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionConfig, VideoMetadata } from "../../utils/types";
import {
  encodeAdvancedModeLanguageCode,
  fetchVideoMetadata,
  findCaptionConfigPair,
  parseVideoId,
  splitManualInputEntries,
  toCaptionConfigOptions,
} from "../../utils/youtube";

//
// loader
//

type LoaderData = {
  videoMetadata: VideoMetadata;
  userCaptionConfigs?: { language1?: CaptionConfig; language2?: CaptionConfig };
};

export const loader = makeLoader(async ({ ctx }) => {
  const query = ROUTE_DEF["/videos/new"].query.parse(ctx.query);
  const videoId = parseVideoId(query.videoId);
  tinyassert(videoId);
  const user = await ctx.currentUser();
  const result = await wrapPromise(fetchVideoMetadata(videoId));
  if (!result.ok) {
    // either invalid videoId or youtube api failure
    await ctx.flash({
      content: `Failed to load a video`,
      variant: "error",
    });
    return redirect(R["/"]);
  }
  const videoMetadata = result.value;
  const loaderData: LoaderData = {
    videoMetadata,
    userCaptionConfigs: user && findUserCaptionConfigs(videoMetadata, user),
  };
  return loaderData;
});

function findUserCaptionConfigs(videoMetadata: VideoMetadata, user: UserTable) {
  if (
    user.language1 &&
    user.language2 &&
    isLanguageCode(user.language1) &&
    isLanguageCode(user.language2)
  ) {
    return findCaptionConfigPair(videoMetadata, {
      code1: user.language1,
      code2: user.language2,
    });
  }
  return;
}

//
// component
//

export const handle: PageHandle = {
  navBarTitle: () => "Select languages",
  navBarMenu: () => <NavBarMenuComponent />,
};

export default function DefaultComponent() {
  const { videoMetadata, userCaptionConfigs } =
    useLoaderDataExtra() as LoaderData;

  const navigate = useNavigate();

  const createMutation = useMutation({
    ...trpc.videos_create.mutationOptions(),
    onSuccess: (data) => {
      if (data.created) {
        toast.success("Created a new video");
      } else {
        toastInfo("Loading an already saved video");
      }
      navigate($R["/videos/$id"](data));
    },
    onError: () => {
      toast.error("Failed to create a video");
    },
  });

  const form = useForm({
    defaultValues: {
      videoId: videoMetadata.videoDetails.videoId,
      language1: userCaptionConfigs?.language1 ?? {
        id: "",
        translation: undefined,
      },
      language2: userCaptionConfigs?.language2 ?? {
        id: "",
        translation: undefined,
      },
    },
  });
  const { videoId, language1, language2 } = form.watch();

  const [showAdvancedMode] = useAtom(showAdvancedModeAtom);

  return (
    <div className="w-full p-4 flex justify-center">
      <div className="w-full max-w-lg border flex flex-col">
        <div className="p-6 flex flex-col gap-3">
          {videoMetadata.captions.playerCaptionsTracklistRenderer.captionTracks
            .length === 0 && (
            <div className="p-2 text-sm text-colorErrorText bg-colorErrorBg border border-colorErrorBorder">
              No caption is available for this video.
            </div>
          )}
          {!videoMetadata.playabilityStatus.playableInEmbed && (
            <div className="p-2 text-sm text-colorErrorText bg-colorErrorBg border border-colorErrorBorder">
              Playback on other websites has been disabled by the video owner.
            </div>
          )}
          <div className="text-xl">Select Languages</div>
          <form
            data-test="setup-form"
            className="w-full flex flex-col gap-3"
            onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
          >
            <label className="flex flex-col gap-1">
              Video ID
              <input
                type="text"
                className="antd-input p-1 bg-colorBgContainerDisabled"
                readOnly
                value={videoId}
              />
            </label>
            <label className="flex flex-col gap-1">
              Author
              <input
                type="text"
                className="antd-input p-1 colorBgContainerDisabled"
                value={videoMetadata.videoDetails.author}
                readOnly
              />
            </label>
            <label className="flex flex-col gap-1">
              Title
              <input
                type="text"
                className="antd-input p-1 colorBgContainerDisabled"
                value={videoMetadata.videoDetails.title}
                readOnly
              />
            </label>
            {!showAdvancedMode && (
              <label className="flex flex-col gap-1">
                1st language
                <LanguageSelectComponent
                  className="antd-input p-1"
                  required
                  value={language1}
                  onChange={(value) => form.setValue("language1", value)}
                  videoMetadata={videoMetadata}
                />
              </label>
            )}
            <label className="flex flex-col gap-1">
              2nd language
              <LanguageSelectComponent
                className="antd-input p-1"
                required
                value={language2}
                onChange={(value) => form.setValue("language2", value)}
                videoMetadata={videoMetadata}
              />
            </label>
            {!showAdvancedMode && (
              <button
                type="submit"
                className={cls(
                  "antd-btn antd-btn-primary p-1",
                  createMutation.isLoading && "antd-btn-loading"
                )}
                disabled={createMutation.isLoading || !form.formState.isValid}
              >
                Save and Play
              </button>
            )}
          </form>
        </div>
        {showAdvancedMode && (
          <>
            <div className="border-t mx-3"></div>
            <AdvancedModeForm
              videoId={videoId}
              language2={language2}
              isLoading={createMutation.isLoading}
              onSubmit={(data) => {
                createMutation.mutate({
                  videoId,
                  language1: {
                    id: data.id,
                  },
                  language2,
                  input: data.input,
                });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function AdvancedModeForm(props: {
  videoId: string;
  language2: CaptionConfig;
  isLoading: boolean;
  onSubmit: (data: { id: string; input: string }) => void;
}) {
  interface FormType {
    language?: LanguageCode;
    input: string;
  }

  const form = useForm<FormType>({
    defaultValues: {
      language: undefined,
      input: "",
    },
  });
  const { language, input } = form.watch();

  const previewModal = useModal();

  return (
    <>
      <form
        className="p-6 flex flex-col gap-3"
        onSubmit={form.handleSubmit((data) => {
          tinyassert(data.language);
          const id = encodeAdvancedModeLanguageCode(data.language);
          props.onSubmit({ id, input: data.input });
        })}
      >
        <div className="text-lg">Manual input</div>
        <label className="flex flex-col gap-1">
          <span>1st language</span>
          <SelectWrapper
            className="antd-input p-1"
            value={language}
            options={[undefined, ...FILTERED_LANGUAGE_CODES]}
            onChange={(v) => form.setValue("language", v)}
            labelFn={(v) => v && languageCodeToName(v)}
          />
        </label>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span>Captions</span>
            <button
              type="button"
              className="antd-btn antd-btn-default text-sm px-1"
              onClick={() => previewModal.setOpen(true)}
            >
              Preview
            </button>
          </div>
          <textarea
            className="antd-input p-1"
            rows={8}
            {...form.register("input", { required: true })}
          />
        </div>
        <button
          type="submit"
          className={cls(
            "antd-btn antd-btn-primary p-1",
            props.isLoading && "antd-btn-loading"
          )}
          disabled={!language || !input}
        >
          Save and Play
        </button>
      </form>
      <previewModal.Wrapper>
        <div className="flex flex-col p-4 relative max-h-[90vh]">
          <AdvancedModePreview
            videoId={props.videoId}
            language2={props.language2}
            input={input}
            setInput={(v) => form.setValue("input", v)}
          />
        </div>
      </previewModal.Wrapper>
    </>
  );
}

function AdvancedModePreview(props: {
  input: string;
  setInput: (input: string) => void;
  videoId: string;
  language2: CaptionConfig;
}) {
  const previewEntriesQuery = useQuery({
    ...trpc.videos_fetchTtmlEntries.queryOptions({
      videoId: props.videoId,
      language: props.language2,
    }),
  });

  const entries1 = splitManualInputEntries(props.input);
  const entries2 = previewEntriesQuery.data?.map((e) => e.text) ?? [];

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <div className="flex-none text-lg">Preview</div>
      {previewEntriesQuery.isFetching && (
        <div className="antd-spin w-10 h-10 m-2 self-center"></div>
      )}
      {previewEntriesQuery.isFetchedAfterMount &&
        previewEntriesQuery.isSuccess && (
          <AdvancedModePreviewEditor
            defaultValue={entries1}
            onChange={(entries1) => {
              const newInput = entries1
                .map((e) => e.replaceAll("\n", " "))
                .join("\n");
              props.setInput(newInput);
            }}
            entries2={entries2}
          />
        )}
    </div>
  );
}

function AdvancedModePreviewEditor(props: {
  defaultValue: string[];
  onChange: (entries1: string[]) => void;
  entries2: string[];
}) {
  const [entries1, setEntries1] = React.useState(() => props.defaultValue);
  const { splice } = toArraySetState(setEntries1);

  React.useEffect(() => {
    props.onChange(entries1);
  }, [entries1]);

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <div className="border p-1 overflow-y-auto">
        <div className="flex flex-col">
          {zipMax(entries1, props.entries2).map(([t1, t2], i) => (
            <div
              key={i}
              className="border-t first:border-0 flex gap-2 p-1 py-2"
            >
              <div className="flex-1 p-0.5 border-r">
                <textarea
                  className="w-full h-full p-0.5"
                  value={t1}
                  onChange={(e) => {
                    splice(i, 1, e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === "Enter") {
                      splice(i + 1, 0, "");
                    }
                    if (e.ctrlKey && e.key === "d") {
                      splice(i, 1);
                    }
                  }}
                />
              </div>
              <div className="flex-1 p-1">{t2}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LanguageSelectComponent({
  value,
  onChange,
  videoMetadata,
  ...selectProps
}: {
  value: CaptionConfig;
  onChange: (value: CaptionConfig) => void;
  videoMetadata: VideoMetadata;
} & Omit<JSX.IntrinsicElements["select"], "value" | "onChange">) {
  const { captions, translationGroups } = toCaptionConfigOptions(videoMetadata);

  return (
    <>
      <select
        {...selectProps}
        value={value.id && JSON.stringify(value)}
        onChange={(e) => {
          onChange(JSON.parse(e.target.value));
        }}
      >
        <option value="" disabled />
        <optgroup label="Captions">
          {captions.map(({ name, captionConfig }) => (
            <option key={name} value={JSON.stringify(captionConfig)}>
              {name}
            </option>
          ))}
        </optgroup>
        {translationGroups.map(({ name: groupName, translations }) => (
          <optgroup key={groupName} label={`Auto Translations (${groupName})`}>
            {translations.map(({ name, captionConfig }) => (
              <option key={name} value={JSON.stringify(captionConfig)}>
                {name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </>
  );
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  const [showAdvancedMode, setShowAdvancedMode] = useAtom(showAdvancedModeAtom);
  return (
    <div className="flex items-center">
      <PopoverSimple
        placement="bottom-end"
        reference={
          <button
            className="antd-btn antd-btn-ghost i-ri-more-2-line w-6 h-6"
            data-testid="video-menu-reference"
          />
        }
        floating={() => (
          <ul className="flex flex-col gap-2 p-2 w-[180px] text-sm">
            <li>
              <button
                className="w-full antd-menu-item p-2 flex gap-2"
                onClick={() => setShowAdvancedMode((prev) => !prev)}
              >
                Manual input
                {showAdvancedMode && (
                  <span className="i-ri-check-line w-5 h-5"></span>
                )}
              </button>
            </li>
          </ul>
        )}
      />
    </div>
  );
}

//
// page local state
//

const showAdvancedModeAtom = atom(false);
