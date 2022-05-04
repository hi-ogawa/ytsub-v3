import { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async () => {
  return {
    APP_DEFINE_PREVIEW_DEPLOY: process.env.APP_DEFINE_PREVIEW_DEPLOY,
  };
};
