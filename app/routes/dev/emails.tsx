import { debugEmails } from "#utils/email-utils";
import { prettierJson } from "#utils/loader-utils";
import type { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async () => {
  return prettierJson(debugEmails);
};
