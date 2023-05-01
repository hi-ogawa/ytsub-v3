import type { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async ({ request }) => {
  return {
    "request.headers": headersEntries(request.headers),
    "process.versions": process.versions,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
};

function headersEntries(headers: Headers) {
  const entries: [string, string][] = [];
  headers.forEach((v, k) => {
    entries.push([k, v]);
  });
  return entries;
}
