import * as React from "react";
import { LoaderFunction, json } from "@remix-run/server-runtime";
import { Form, useCatch, useLoaderData } from "@remix-run/react";
import { fetchVideoMetadata, toCaptionConfigOptions } from "../utils/youtube";
import { CaptionConfig, VideoMetadata } from "../utils/types";

// TODO: redirect + snackbar on error
export const loader: LoaderFunction = async ({ request }) => {
  const videoId = new URL(request.url).searchParams.get("videoId");
  if (!videoId) {
    throw json({ message: "Video ID is required" });
  }
  const videoMetadata = await fetchVideoMetadata(videoId);
  if (videoMetadata.playabilityStatus.status !== "OK") {
    throw json({ message: "Invalid Video ID" });
  }
  return videoMetadata;
};

export default function Component() {
  const videoMetadata: VideoMetadata = useLoaderData();
  return (
    <div className="w-full p-4 flex justify-center">
      <div className="h-full w-full max-w-lg rounded-lg border border-base-300">
        <div className="h-full p-6 flex flex-col">
          <div className="text-xl font-bold mb-1">Select Languages</div>
          <Form
            method="get"
            action="/watch"
            className="w-full flex flex-col gap-1"
            data-test="setup-form"
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
                defaultValue=""
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
                defaultValue=""
                videoMetadata={videoMetadata}
                propertyName="language2"
              />
            </div>
            <button type="submit" className="btn mt-3">
              Play
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export function CatchBoundary() {
  const { data } = useCatch();
  return <div>ERROR: {data.message}</div>;
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
