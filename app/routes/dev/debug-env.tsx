import { sortBy } from "@hiogawa/utils";
import type { LoaderFunction } from "@remix-run/server-runtime";
import { verifyPassword } from "../../utils/auth";
import { prettierJson } from "../../utils/loader-utils";

// pnpm console
// > await require("./app/utils/auth.ts").toPasswordHash("Basic " + Buffer.from("<user>:<pass>").toString("base64"))
const PASSWORD_HASH =
  "$2a$10$SInJ/nZ5Q59BhpfWYIOvDOzXZWFD37tDCqr3dkEbvod5/0QKi3CSy";

export const loader: LoaderFunction = async ({ request }) => {
  const authorization = request.headers.get("authorization") ?? "";
  if (!(await verifyPassword(authorization, PASSWORD_HASH))) {
    return new Response("", {
      status: 401,
      headers: {
        "www-authenticate": 'Basic realm="debug-env"',
      },
    });
  }
  const res = sortObjectBy(process.env, (_v, k) => k);
  return prettierJson(res);
};

function sortObjectBy<T>(
  record: Record<string, T>,
  keyFn: (v: T, k: string) => unknown
): Record<string, T> {
  return Object.fromEntries(
    sortBy(Object.entries(record), ([k, v]) => keyFn(v, k))
  );
}
