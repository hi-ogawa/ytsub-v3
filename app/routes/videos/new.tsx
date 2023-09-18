import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { createTinyStore } from "@hiogawa/tiny-store";
import { useTinyStore } from "@hiogawa/tiny-store/dist/react";
import { tinyassert } from "@hiogawa/utils";
import { useNavigate } from "@remix-run/react";
import { useMutation } from "@tanstack/react-query";
import { SelectWrapper } from "../../components/misc";
import { PopoverSimple } from "../../components/popover";
import { $R } from "../../misc/routes";
import { rpcClient, rpcClientQuery } from "../../trpc/client";
import {
  FILTERED_LANGUAGE_CODES,
  LanguageCode,
  languageCodeToName,
} from "../../utils/language";
import { useLoaderDataExtra } from "../../utils/loader-utils";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { toast2 } from "../../utils/toast-utils";
import type { CaptionConfig, VideoMetadata } from "../../utils/types";
import {
  encodeAdvancedModeLanguageCode,
  toCaptionConfigOptions,
} from "../../utils/youtube";
import type { LoaderData } from "./new.server";
export { loader } from "./new.server";

export const handle: PageHandle = {
  navBarTitle: () => "Select languages",
  navBarMenu: () => <NavBarMenuComponent />,
};

export default function DefaultComponent() {
  // remount on parameter change to reset form state
  const loaderData = useLoaderDataExtra() as LoaderData;
  return (
    <DefaultComponentInner
      key={loaderData.videoMetadata.videoDetails.videoId}
    />
  );
}

function DefaultComponentInner() {
  const { videoMetadata, userCaptionConfigs } =
    useLoaderDataExtra() as LoaderData;

  const navigate = useNavigate();

  const createMutation = useMutation({
    ...rpcClientQuery.videos_create.mutationOptions(),
    onSuccess: (data) => {
      if (data.created) {
        toast2.success("Created a new video");
      } else {
        toast2.info("Loading an already saved video");
      }
      navigate($R["/videos/$id"](data));
    },
  });

  const form = useTinyForm(() => ({
    videoId: videoMetadata.videoDetails.videoId,
    language1: userCaptionConfigs?.language1 ?? {
      id: "",
      translation: undefined,
    },
    language2: userCaptionConfigs?.language2 ?? {
      id: "",
      translation: undefined,
    },
  }));

  const [showAdvancedMode] = useTinyStore(showAdvancedModeStore);

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
            onSubmit={form.handleSubmit(() => createMutation.mutate(form.data))}
          >
            <label className="flex flex-col gap-1">
              Video ID
              <input
                type="text"
                className="antd-input p-1 bg-colorBgContainerDisabled"
                readOnly
                value={form.data.videoId}
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
              <>
                <label className="flex flex-col gap-1">
                  1st language
                  <LanguageSelectComponent
                    className="antd-input p-1"
                    required
                    videoMetadata={videoMetadata}
                    {...form.fields.language1.rawProps()}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  2nd language
                  <LanguageSelectComponent
                    className="antd-input p-1"
                    required
                    videoMetadata={videoMetadata}
                    {...form.fields.language2.rawProps()}
                  />
                </label>
                <button
                  type="submit"
                  className={cls(
                    "antd-btn antd-btn-primary p-1",
                    createMutation.isLoading && "antd-btn-loading"
                  )}
                  disabled={
                    createMutation.isLoading || createMutation.isSuccess
                  }
                >
                  Save and Play
                </button>
              </>
            )}
          </form>
        </div>
        {showAdvancedMode && (
          <>
            <div className="border-t mx-3"></div>
            <AdvancedModeForm videoId={form.data.videoId} />
          </>
        )}
      </div>
    </div>
  );
}

function AdvancedModeForm({ videoId }: { videoId: string }) {
  interface FormType {
    language1: LanguageCode | undefined;
    language2: LanguageCode | undefined;
    input: string;
  }

  const form = useTinyForm<FormType>({
    language1: undefined,
    language2: undefined,
    input: "",
  });

  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: async (data: FormType) => {
      tinyassert(data.language1);
      tinyassert(data.language2);
      return rpcClient.videos_createDirect({
        videoId,
        language1: {
          id: encodeAdvancedModeLanguageCode(data.language1),
        },
        language2: {
          id: encodeAdvancedModeLanguageCode(data.language2),
        },
        captionEntries: JSON.parse(data.input), // validated on trpc input
      });
    },
    onSuccess: (data) => {
      toast2.success("Created a new video");
      navigate($R["/videos/$id"]({ id: data.id }));
    },
  });

  return (
    <form
      className="p-6 flex flex-col gap-3"
      onSubmit={form.handleSubmit(() => createMutation.mutate(form.data))}
    >
      <div className="text-lg">Manual input</div>
      <label className="flex flex-col gap-1">
        <span>1st language</span>
        <SelectWrapper
          className="antd-input p-1"
          options={[undefined, ...FILTERED_LANGUAGE_CODES]}
          labelFn={(v) => v && languageCodeToName(v)}
          required
          {...form.fields.language1.rawProps()}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>2nd language</span>
        <SelectWrapper
          className="antd-input p-1"
          options={[undefined, ...FILTERED_LANGUAGE_CODES]}
          labelFn={(v) => v && languageCodeToName(v)}
          required
          {...form.fields.language2.rawProps()}
        />
      </label>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span>Input</span>
          <a
            className="antd-link text-sm flex items-center gap-1"
            href={$R["/caption-editor/watch"](null, { v: videoId })}
            target="_blank"
          >
            Open caption editor
            <span className="i-ri-external-link-line w-4 h-4"></span>
          </a>
        </div>
        <textarea
          className="antd-input p-1"
          rows={8}
          placeholder="Please copy the exported data from caption editor"
          required
          {...form.fields.input.props()}
        />
      </div>
      <button
        type="submit"
        className={cls(
          "antd-btn antd-btn-primary p-1",
          createMutation.isLoading && "antd-btn-loading"
        )}
        disabled={createMutation.isLoading || createMutation.isSuccess}
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
  const [showAdvancedMode, setShowAdvancedMode] = useTinyStore(
    showAdvancedModeStore
  );
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
                Use caption editor
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

const showAdvancedModeStore = createTinyStore(false);
