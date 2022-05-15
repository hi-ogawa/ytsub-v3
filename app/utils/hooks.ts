import * as React from "react";
import { UseQueryOptions, useQuery } from "react-query";
import { deserialize } from "./controller-utils";
import { loadYoutubeIframeApi } from "./youtube";

export function useRafLoop(callback: () => void): void {
  React.useEffect(() => {
    let id: number | undefined;
    function loop() {
      callback();
      id = requestAnimationFrame(loop);
    }
    loop();
    return () => {
      if (typeof id === "number") {
        cancelAnimationFrame(id);
      }
    };
  }, [callback]);
}

// TODO: can we reuse `useRafLoop` above to implement this?
export function useRafTime(): [number, () => void, () => void] {
  const rafId = React.useRef<number>();
  const base = React.useRef<number>();
  const [time, setTime] = React.useState(0);

  const loop = React.useCallback((rafTime: number) => {
    if (typeof base.current === "undefined") {
      base.current = rafTime;
    }
    setTime(rafTime - base.current);
    rafId.current = requestAnimationFrame(loop);
  }, []);

  React.useEffect(() => {
    return () => {
      if (typeof rafId.current !== "undefined") {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  function start() {
    end();
    rafId.current = requestAnimationFrame(loop);
  }

  function end() {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = undefined;
    }
    base.current = undefined;
    setTime(0);
  }

  return [time, start, end];
}

export function useIsFormValid() {
  const ref = React.useRef<HTMLFormElement>(null);
  const [isValid, setIsValid] = React.useState(false);
  React.useEffect(onChange, []);

  function onChange() {
    setIsValid(!!ref.current?.checkValidity());
  }

  const formProps = { ref, onChange };

  return [isValid, formProps] as const;
}

// Based on https://github.com/remix-run/remix/issues/180
let _hydrated = false;
export function useHydrated() {
  const [hydrated, setHydrated] = React.useState(_hydrated);
  React.useEffect(() => setHydrated((_hydrated = true)), []);
  return hydrated;
}

function createUseQuery<TQueryFnArg, TQueryFnData>(
  key: any,
  queryFnWithArg: (arg: TQueryFnArg) => Promise<TQueryFnData>,
  defaultOptions?: Pick<
    UseQueryOptions<TQueryFnData, Error, unknown>,
    "staleTime" | "cacheTime" // Allow more options as needed
  >
) {
  return function useQueryWrapper<TData = TQueryFnData>(
    arg: TQueryFnArg,
    options?: Omit<
      UseQueryOptions<TQueryFnData, Error, TData>,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<TQueryFnData, Error, TData>(
      [key, arg],
      () => queryFnWithArg(arg),
      { ...defaultOptions, ...options }
    );
  };
}

export const useYoutubeIframeApi = createUseQuery(
  "youtube-iframe-api",
  loadYoutubeIframeApi,
  { staleTime: Infinity, cacheTime: Infinity }
);

export function useMemoWrap<F extends (_: D) => any, D>(
  f: F,
  data: D
): ReturnType<F> {
  return React.useMemo(() => f(data), [data]);
}

export function useDeserialize(data: any): any {
  return useMemoWrap(deserialize, data);
}

export function useSelection(listener: (selection?: Selection) => void) {
  React.useEffect(() => {
    function listenerImpl() {
      listener(document.getSelection() ?? undefined);
    }
    document.addEventListener("selectionchange", listenerImpl);
    return () => document.removeEventListener("selectionchange", listenerImpl);
  }, [listener]);
}
