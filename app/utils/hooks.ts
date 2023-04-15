import React from "react";
import { deserialize } from "./controller-utils";

function useMemoWrap<F extends (_: D) => any, D>(f: F, data: D): ReturnType<F> {
  return React.useMemo(() => f(data), [data]);
}

export function useDeserialize(data: any): any {
  return useMemoWrap(deserialize, data);
}
