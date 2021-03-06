import { LoaderFunction, json } from "@remix-run/server-runtime";
import { fromPairs, sortBy, toPairs } from "lodash";
import { verifyPassword } from "../utils/auth";

// npm run console
// > await require("./app/utils/auth.ts").toPasswordHash("Basic " + Buffer.from("<user>:<pass>").toString("base64"))
const PASSWORD_HASH =
  "$2a$10$SInJ/nZ5Q59BhpfWYIOvDOzXZWFD37tDCqr3dkEbvod5/0QKi3CSy";

export const loader: LoaderFunction = async ({ request }) => {
  const authorization = request.headers.get("authorization") ?? "";
  if (!(await verifyPassword(authorization, PASSWORD_HASH))) {
    return new Response("", {
      status: 401,
      headers: {
        "www-authenticate": 'Basic realm="debug-secret"',
      },
    });
  }
  return json(fromPairs(sortBy(toPairs(process.env), ([k]) => k)));
};
