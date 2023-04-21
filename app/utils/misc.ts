import { tinyassert } from "@hiogawa/utils";

// TODO: remove
export function fromEntries<K extends string, V>(
  entries: [K, V][]
): Record<K, V> {
  return Object.fromEntries(entries) as any;
}

export function createGetProxy(
  propHandler: (prop: string | symbol) => unknown
): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop, _receiver) {
        return propHandler(prop);
      },
    }
  );
}

export const uninitialized = createGetProxy((p) => {
  throw new Error(`uninitialized: prop = ${p.toString()}`);
}) as any;

export function cls(...args: unknown[]): string {
  return args.filter(Boolean).join(" ");
}

export function usePromiseQueryOpitons<T>(queryFn: () => Promise<T>) {
  return {
    queryKey: ["usePromise", String(queryFn)],
    queryFn,
  };
}

export function assertUnreachable(_value: never): never {
  tinyassert(false, "unreachable");
}
