import { tinyassert, wrapPromise } from "@hiogawa/utils";
import { useNavigate } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import type { UserTable } from "../../db/models";
import { $R, R, ROUTE_DEF } from "../../misc/routes";
import { trpc } from "../../trpc/client";
import { toastInfo } from "../../utils/flash-message-hook";
import { isLanguageCode } from "../../utils/language";
import {
  makeLoader,
  useDeLoaderData,
  useRootLoaderData,
} from "../../utils/loader-utils";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionConfig, VideoMetadata } from "../../utils/types";
import {
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
};

export default function DefaultComponent() {
  const { currentUser } = useRootLoaderData();
  const { videoMetadata, userCaptionConfigs } = useDeLoaderData() as LoaderData;

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

  return (
    <div className="w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-lg border">
        <div className="h-full p-6 flex flex-col gap-3">
          {videoMetadata.captions.playerCaptionsTracklistRenderer.captionTracks
            .length === 0 && (
            <div className="p-2 text-sm text-colorErrorText bg-colorErrorBg border border-colorErrorBorder">
              No caption is available for this video.
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
                {...form.register("videoId", { required: true })}
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
            <label className="flex flex-col gap-1">
              1st language
              <LanguageSelectComponent
                className="antd-input p-1"
                required
                value={form.watch("language1")}
                onChange={(value) => form.setValue("language1", value)}
                videoMetadata={videoMetadata}
              />
            </label>
            <label className="flex flex-col gap-1">
              2nd language
              <LanguageSelectComponent
                className="antd-input p-1"
                required
                value={form.watch("language2")}
                onChange={(value) => form.setValue("language2", value)}
                videoMetadata={videoMetadata}
              />
            </label>
            <button
              type="submit"
              className={cls(
                "antd-btn antd-btn-primary p-1",
                createMutation.isLoading && "antd-btn-loading"
              )}
              disabled={createMutation.isLoading || !form.formState.isValid}
            >
              {currentUser ? "Save and Play" : "Play"}
            </button>
          </form>
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
