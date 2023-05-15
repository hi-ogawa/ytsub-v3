import { tinyassert, wrapPromise } from "@hiogawa/utils";
import { useNavigate } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useMutation } from "@tanstack/react-query";
import { atom, useAtom } from "jotai";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { SelectWrapper } from "../../components/misc";
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
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionConfig, VideoMetadata } from "../../utils/types";
import {
  encodeAdvancedModeLanguageCode,
  fetchVideoMetadata,
  findCaptionConfigPair,
  parseVideoId,
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
            <label
              className={cls(
                "flex flex-col gap-1",
                showAdvancedMode && "!hidden"
              )}
            >
              1st language
              <LanguageSelectComponent
                className="antd-input p-1"
                required
                value={language1}
                onChange={(value) => form.setValue("language1", value)}
                videoMetadata={videoMetadata}
              />
            </label>
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
            <button
              type="submit"
              className={cls(
                "antd-btn antd-btn-primary p-1",
                createMutation.isLoading && "antd-btn-loading",
                showAdvancedMode && "!hidden"
              )}
              disabled={createMutation.isLoading || !form.formState.isValid}
            >
              Save and Play
            </button>
          </form>
        </div>
        {showAdvancedMode && (
          <>
            <div className="border-t mx-3"></div>
            <AdvancedModeForm
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

// TODO: preview `fetchCaptionEntriesHalfManual` before creation?
function AdvancedModeForm(props: {
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

  return (
    <form
      className="p-6 flex flex-col gap-3"
      onSubmit={form.handleSubmit((data) => {
        tinyassert(data.language);
        const id = encodeAdvancedModeLanguageCode(data.language);
        props.onSubmit({ id, input: data.input });
      })}
    >
      <div className="text-lg">Advanced mode</div>
      <label className="flex flex-col gap-1">
        <span className="text-colorTextLabel">1st language</span>
        <SelectWrapper
          className="antd-input p-1"
          value={form.watch("language")}
          options={[undefined, ...FILTERED_LANGUAGE_CODES]}
          onChange={(v) => form.setValue("language", v)}
          labelFn={(v) => v && languageCodeToName(v)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-colorTextLabel">Captions</span>
        <textarea
          className="antd-input p-1"
          {...form.register("input", { required: true })}
        />
      </label>
      <button
        type="submit"
        className={cls(
          "antd-btn antd-btn-primary p-1",
          props.isLoading && "antd-btn-loading"
        )}
        disabled={!form.formState.isValid}
      >
        Save and Play
      </button>
    </form>
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
                Advanced Mode
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
