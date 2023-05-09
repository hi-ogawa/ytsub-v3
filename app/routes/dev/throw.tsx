import type { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async () => {
  throw new Error("Boom🔥");
};
