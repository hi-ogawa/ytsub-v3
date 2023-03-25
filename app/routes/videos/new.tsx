import { Form, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import React from "react";
import { z } from "zod";
import { filterNewVideo, insertVideoAndCaptionEntries } from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { AppError } from "../../utils/errors";
import { useIsFormValid } from "../../utils/hooks";
import { useRootLoaderData } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import type { CaptionConfig, VideoMetadata } from "../../utils/types";
import { NEW_VIDEO_SCHEMA, fetchCaptionEntries } from "../../utils/youtube";
import {
  fetchVideoMetadata,
  findCaptionConfigPair,
  parseVideoId,
  toCaptionConfigOptions,
} from "../../utils/youtube";

//
// loader
//

const LOADER_SCHEMA = z.object({
  videoId: z.string().nonempty(),
});

export const loader = makeLoader(Controller, async function () {
  const parsed = LOADER_SCHEMA.safeParse(this.query());
  if (parsed.success) {
    const videoId = parseVideoId(parsed.data.videoId);
    if (videoId) {
      try {
        return await fetchVideoMetadata(videoId);
      } catch (e) {
        // TODO: improve error message
        // - invalid videoId
        // - failed to fetch (e.g. video not found)
        // - no subtitle
        let message = e instanceof Error ? e.message : "(unknown error)";
        this.flash({
          content: `Failed to load a video:\n${message}`,
          variant: "error",
        });
        return redirect(R["/"]);
      }
    }
  }
  this.flash({
    content: "Invalid input",
    variant: "error",
  });
  return redirect(R["/"]);
});

//
// action
//

export const action = makeLoader(Controller, async function () {
  const parsed = NEW_VIDEO_SCHEMA.safeParse(await this.form());
  if (!parsed.success) throw new AppError("Invalid parameters");

  const user = await this.currentUser();
  const row = await filterNewVideo(parsed.data, user?.id).select("id").first();
  let id = row?.id;
  if (id) {
    this.flash({
      content: "Loaded existing video",
      variant: "info",
    });
  } else {
    const data = await fetchCaptionEntries(parsed.data);
    id = await insertVideoAndCaptionEntries(parsed.data, data, user?.id);
    this.flash({
      content: "Created new video",
      variant: "success",
    });
  }
  return redirect(R["/videos/$id"](id));
});

//
// component
//

export const handle: PageHandle = {
  navBarTitle: () => "Select languages",
};

export default function DefaultComponent() {
  const { currentUser } = useRootLoaderData();
  const videoMetadata: VideoMetadata = useLoaderData();
  const [isValid, formProps] = useIsFormValid();

  // TODO: more heuristics to set default languages e.g.
  //   language1 = { id: <any caption track> } (maybe we can infer from `videoDetails.keywords`)
  //   language2 = { id: language1.id, translation: "en" }
  let defaultValues = ["", ""];
  const { language1, language2 } = currentUser ?? {};
  if (language1 && language2) {
    const pair = findCaptionConfigPair(videoMetadata, [
      language1,
      language2,
    ] as any);
    pair.forEach((config, i) => {
      if (config) {
        defaultValues[i] = JSON.stringify(config);
      }
    });
  }

  return (
    <div className="w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-lg border">
        <div className="h-full p-6 flex flex-col gap-3">
          <div className="text-xl">Select Languages</div>
          <Form
            method="post"
            action={R["/videos/new"]}
            className="w-full flex flex-col gap-3"
            // TODO: rename to new-video-form
            data-test="setup-form"
            {...formProps}
          >
            <label className="flex flex-col gap-1">
              Video ID
              <input
                name="videoId"
                type="text"
                className="antd-input p-1 bg-colorBgContainerDisabled"
                value={videoMetadata.videoDetails.videoId}
                readOnly
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
                defaultValue={defaultValues[0]}
                videoMetadata={videoMetadata}
                propertyName="language1"
              />
            </label>
            <label className="flex flex-col gap-1">
              2nd language
              <LanguageSelectComponent
                className="antd-input p-1"
                required
                defaultValue={defaultValues[1]}
                videoMetadata={videoMetadata}
                propertyName="language2"
              />
            </label>
            <button
              type="submit"
              className="antd-btn antd-btn-primary p-1"
              disabled={!isValid}
            >
              {currentUser ? "Save and Play" : "Play"}
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}

function LanguageSelectComponent({
  videoMetadata,
  propertyName,
  ...props
}: JSX.IntrinsicElements["select"] & {
  videoMetadata: VideoMetadata;
  propertyName: string;
}) {
  const ref0 = React.useRef<HTMLSelectElement>();
  const ref1 = React.useRef<HTMLInputElement>();
  const ref2 = React.useRef<HTMLInputElement>();
  React.useEffect(copy, []);

  function copy() {
    const value = ref0.current?.value;
    if (value) {
      const { id, translation } = JSON.parse(value) as CaptionConfig;
      ref1.current!.value = id;
      ref2.current!.value = translation ?? "";
    } else {
      ref1.current!.value = "";
      ref2.current!.value = "";
    }
  }

  const { captions, translationGroups } = toCaptionConfigOptions(videoMetadata);
  return (
    <>
      <input ref={ref1 as any} name={`${propertyName}.id`} hidden />
      <input ref={ref2 as any} name={`${propertyName}.translation`} hidden />
      <select ref={ref0 as any} {...props} onChange={() => copy()}>
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
