import { LoaderArgs, json, redirect } from "@remix-run/server-runtime";
import { $R } from "../misc/routes";
import { ctx_currentUser } from "../server/request-context/session";
import { ctx_get } from "../server/request-context/storage";
import { encodeFlashMessage } from "./flash-message";
import { jsonExtraSerialize } from "./json-extra";

// - setup route "params" in async context
// - custom json serializer by default
export function wrapLoader(loader: () => unknown) {
  return async ({ params }: LoaderArgs) => {
    ctx_get().params = params;
    const res = await loader();
    return res instanceof Response ? res : json(jsonExtraSerialize(res));
  };
}

//
// error response helpers
//

export function assertOrRespond(v: unknown, status: number = 404): asserts v {
  if (!v) {
    throw json(null, { status });
  }
}

// ts-prune-ignore-next
export function unwrapOrRespond<T>(v: T, status: number) {
  if (!v) {
    throw json(null, { status });
  }
  return v;
}

// ts-prune-ignore-next
export function unwrapResultOrRespond<T1, T2>(
  v: { ok: true; value: T1 } | { ok: false; value: T2 },
  status: number = 400
) {
  if (!v.ok) {
    throw json(null, { status });
  }
  return v.value;
}

export function unwrapZodResultOrRespond<T1, T2>(
  v: { success: true; data: T1 } | { success: false; error: T2 },
  status: number = 400
) {
  if (!v.success) {
    throw json({ error: v.error }, { status });
  }
  return v.data;
}

//
// context helper
//

export async function ctx_requireUserOrRedirect() {
  const user = await ctx_currentUser();
  if (!user) {
    throw redirect(
      $R["/users/signin"]() +
        "?" +
        encodeFlashMessage({ content: "Signin required", variant: "error" })
    );
  }
  return user;
}
