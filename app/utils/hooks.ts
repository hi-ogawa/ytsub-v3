import React from "react";
import { UseQueryOptions, useQuery } from "react-query";
import { deserialize } from "./controller-utils";
import { loadYoutubeIframeApi } from "./youtube";

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

export function createUseQuery<TQueryFnArg, TQueryFnData>(
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
