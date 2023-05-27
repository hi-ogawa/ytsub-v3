import type { LoaderFunction } from "@remix-run/server-runtime";
import { debugEmails } from "../../utils/email-utils";
import { prettierJson } from "../../utils/loader-utils";

export const loader: LoaderFunction = async () => {
  return prettierJson(debugEmails);
};
