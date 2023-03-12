import type { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async () => {
  return {
    "process.versions": process.versions,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
};
