import { newPromiseWithResolvers } from "@hiogawa/utils";
import { UseQueryOptions, useQuery } from "@tanstack/react-query";

// TODO: js-utils
export function fromEntries<K extends string, V>(
  entries: [K, V][]
): Record<K, V> {
  return Object.fromEntries(entries) as any;
}

//
// Proxy to warn unexpected access
//

export const throwGetterProxy = new Proxy(
  {},
  {
    get: (_target, p) => {
      console.error("throwGetterProxy", p);
      throw new Error(`throwGetterProxy: ` + p.toString());
    },
  }
);

export function cls(...args: unknown[]): string {
  return args.filter(Boolean).join(" ");
}

// TODO: to js-utils
export async function loadScript(src: string): Promise<void> {
  const { promise, resolve, reject } = newPromiseWithResolvers<void>();
  const el = document.createElement("script");
  el.src = src;
  el.async = true;
  el.addEventListener("load", () => resolve());
  el.addEventListener("error", reject);
  document.body.appendChild(el);
  await promise;
}

// query for singleton promise
export function usePromise<T>(
  queryFn: () => Promise<T>,
  options?: UseQueryOptions<T, unknown, T, string[]>
) {
  return useQuery({
    queryKey: ["usePromise", String(queryFn)],
    queryFn,
    staleTime: Infinity,
    cacheTime: Infinity,
    ...options,
  });
}
