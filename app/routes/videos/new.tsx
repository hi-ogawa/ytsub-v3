import { tinyassert, wrapPromise } from "@hiogawa/utils";
import { useNavigate } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useMutation, useQuery } from "@tanstack/react-query";
import { atom, useAtom } from "jotai";
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
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionConfig, VideoMetadata } from "../../utils/types";
import {
  encodeAdvancedModeLanguageCode,
  fetchVideoMetadata,
  findCaptionConfigPair,
  mergeTtmlEntriesHalfManualNonStrict,
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

// TODO: preview `fetchCaptionEntriesHalfManual` before creation?
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
  const { input } = form.watch();

  const previewModal = useModal(true);

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
            value={form.watch("language")}
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
          disabled={!form.formState.isValid}
        >
          Save and Play
        </button>
      </form>
      <previewModal.Wrapper>
        <div className="flex flex-col gap-2 p-4 relative h-[90vh]">
          <div className="flex-none text-lg">Preview</div>
          <AdvancedModePreview
            videoId={props.videoId}
            language2={props.language2}
            input={input}
          />
        </div>
      </previewModal.Wrapper>
    </>
  );
}

function AdvancedModePreview(props: {
  input: string;
  videoId: string;
  language2: CaptionConfig;
}) {
  const previewEntriesQuery = useQuery({
    ...trpc.videos_fetchTtmlEntries.queryOptions({
      videoId: props.videoId,
      language: props.language2,
    }),
    // select: (data) => mergeTtmlEntriesHalfManualNonStrict(props.input, data),
    select: (data) => mergeTtmlEntriesHalfManualNonStrict(devInput, data),
    onError: () => {
      toast.error("failed to fetch captions");
    },
  });

  return (
    <div className="flex flex-col overflow-hidden">
      {previewEntriesQuery.isLoading && (
        <div className="antd-spin w-6 h-6 m-2 self-center"></div>
      )}
      {/* TODO: directly edit from this table? */}
      {previewEntriesQuery.isSuccess && (
        <div className="border p-1 overflow-y-auto">
          <div className="flex flex-col">
            {previewEntriesQuery.data.map((e, i) => (
              <div
                key={i}
                className="border-t first:border-0 flex gap-2 p-1 py-2"
              >
                <div className="flex-1 p-0.5 border-r">
                  <textarea
                    className="w-full h-full p-0.5"
                    defaultValue={e.text1}
                  />
                </div>
                <div className="flex-1 p-1">{e.text2}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const devInput = `
기분이 들떠
Like a star like a star
걸음에 시선이 쏟아져

아닌척해도 살짝살짝
너 역시 나를 보잖아요
힐끔힐끔

여전히 난 어려워
어디로 향하는지
숨길 수 없어진 나의 맘을
따라와 줘 GLASSY

So bright 좋아 모든 빛을 쏟아내는 Eyes
눈을 뜨면 한편의 영화 같은 떨림
너랑 나랑 Someday
시작해 My baby

라라라 라라라
나의 두 발이 이끌 My journey
라라라 라라라
온몸이 짜릿 떨려 Like dreaming

망설이지 마 Don't Stop don't stop
기다릴 시간이 없거든

머뭇거리면 째깍째깍
결국엔 또 엇갈릴 거야 삐끗삐끗

발끝이 아찔하게 어디로 향하든지
순수한 상상 그 끝 너머에 데려다줘 GLASSY

So bright 좋아 모든 빛을 쏟아내는 Eyes
눈을 뜨면 한편의 영화 같은 떨림
너랑 나랑 Someday
시작해 My baby

24/7 (Twenty Twenty Twenty Four Seven)
그래 24/7 (Twenty Twenty Twenty Four Seven)
It's about time

한 걸음씩 되돌아가 몇 번을 말해도
입버릇 돼 좀 더 날 안아줘
이제는 더운 공기를 채워 더 높이높이 날아

So bright 좋아 모든 빛을 쏟아내는 Eyes
눈을 뜨면 한편의 영화 같은 떨림
너랑 나랑 Someday 시작해 My baby

라라라 라라라
나의 두 발이 이끌 My journey
라라라 라라라
온몸이 짜릿 떨려 Like dreaming
`;

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

const showAdvancedModeAtom = atom(true);
