import { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async () => {
  return {
    APP_DEFINE_STAGING: process.env.APP_DEFINE_STAGING,
    "process.versions": process.versions,
  };
};
