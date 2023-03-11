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
      const videoMetadata = await fetchVideoMetadata(videoId);
      if (videoMetadata.playabilityStatus.status === "OK") {
        return videoMetadata;
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
      <div className="h-full w-full max-w-lg rounded-lg border border-base-300">
        <div className="h-full p-6 flex flex-col">
          <div className="text-xl font-bold mb-1">Select Languages</div>
          <Form
            method="post"
            action={R["/videos/new"]}
            className="w-full flex flex-col gap-1"
            // TODO: rename to new-video-form
            data-test="setup-form"
            {...formProps}
          >
            <div className="form-control">
              <label className="label">
                <label className="label-text">Video ID</label>
              </label>
              <input
                name="videoId"
                type="text"
                className="w-full input input-bordered bg-gray-100"
                value={videoMetadata.videoDetails.videoId}
                readOnly
              />
            </div>
            <div className="form-control">
              <label className="label">
                <label className="label-text">Author</label>
              </label>
              <input
                type="text"
                className="w-full input input-bordered bg-gray-100"
                value={videoMetadata.videoDetails.author}
                readOnly
              />
            </div>
            <div className="form-control">
              <label className="label">
                <label className="label-text">Title</label>
              </label>
              <input
                type="text"
                className="w-full input input-bordered bg-gray-100"
                value={videoMetadata.videoDetails.title}
                readOnly
              />
            </div>
            <div className="form-control">
              <label className="label">
                <label className="label-text">1st language</label>
              </label>
              <LanguageSelectComponent
                className="select select-bordered font-normal"
                required
                defaultValue={defaultValues[0]}
                videoMetadata={videoMetadata}
                propertyName="language1"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <label className="label-text">2nd language</label>
              </label>
              <LanguageSelectComponent
                className="select select-bordered font-normal"
                required
                defaultValue={defaultValues[1]}
                videoMetadata={videoMetadata}
                propertyName="language2"
              />
            </div>
            <button type="submit" className="btn mt-3" disabled={!isValid}>
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
