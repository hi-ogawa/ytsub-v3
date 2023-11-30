import { escapeRegExp, mapRegExp, range } from "@hiogawa/utils";

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
    staleTime: Infinity,
    cacheTime: Infinity,
  };
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

// safely create non-Partial record by forcing to provide complete keys (cf. https://github.com/colinhacks/zod/blob/502384e56fe2b1f8173735df6c3b0d41bce04edc/src/types.ts#L3946)
export function objectFromMapDefault<
  K extends string,
  Keys extends [K, ...K[]],
  V
>(
  map: Map<Keys[number], V>,
  keys: Keys,
  defaultValue: V
): Record<Keys[number], V> {
  return {
    ...defaultObject(keys, defaultValue),
    ...objectFromMap(map),
  };
}

export function defaultObject<K extends string, Keys extends [K, ...K[]], V>(
  keys: Keys,
  defaultValue: V
): Record<Keys[number], V> {
  return Object.fromEntries(keys.map((t) => [t, defaultValue])) as any;
}

// shortcut for `undefined as T | undefined`
export function none<T>(): T | undefined {
  return undefined;
}

export function zipMax<T1, T2>(
  ls1: readonly T1[],
  ls2: readonly T2[]
): [T1 | undefined, T2 | undefined][] {
  const length = Math.max(ls1.length, ls2.length);
  return range(length).map((i) => [ls1[i], ls2[i]]);
}

export function pathToRegExp(pattern: string) {
  const keys: string[] = [];
  let source = "";
  mapRegExp(
    pattern,
    /:\w+/g,
    (match) => {
      keys.push(match[0].slice(1));
      source += `(\\w+)`;
    },
    (other) => {
      source += escapeRegExp(other);
    }
  );
  return { regexp: new RegExp(`^${source}$`), keys };
}

export function isEqualArrayShallow(x: unknown[], y: unknown[]) {
  return x.length === y.length && x.every((v, i) => v === y[i]);
}
