import { groupBy, mapValues, tinyassert } from "@hiogawa/utils";

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

export const uninitialized: unknown = createGetProxy((p) => {
  throw new Error(`uninitialized object access '${p.toString()}'`);
});

export function cls(...args: unknown[]): string {
  return args.filter(Boolean).join(" ");
}

export function usePromiseQueryOpitons<T>(queryFn: () => Promise<T>) {
  return {
    queryKey: ["usePromise", String(queryFn)],
    queryFn,
  };
}

// TODO: to utils
export function assertUnreachable(_value: never): never {
  tinyassert(false, "unreachable");
}

export function mapGroupBy<T, K, V>(
  ls: T[],
  keyFn: (v: T) => K,
  valueFn: (vs: T[]) => V
) {
  return mapValues(groupBy(ls, keyFn), valueFn);
}

export function objectFromMap<K extends keyof any, V>(
  map: Map<K, V>
): Partial<Record<K, V>> {
  const result: Partial<Record<K, V>> = {};
  for (const [k, v] of map) {
    result[k] = v;
  }
  return result;
}
