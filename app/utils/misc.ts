import { groupBy, mapValues, range, tinyassert } from "@hiogawa/utils";

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

export function capitalize(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1);
}

// shortcut for `undefined as T | undefined`
export function none<T>(): T | undefined {
  return undefined;
}

export function zip<T1, T2>(
  ls1: readonly T1[],
  ls2: readonly T2[]
): [T1, T2][] {
  return range(Math.min(ls1.length, ls2.length)).map((i) => [ls1[i], ls2[i]]);
}

export function difference<T>(ls1: T[], ls2: T[]): T[] {
  const exclude = new Set(ls2);
  return ls1.filter((e) => !exclude.has(e));
}

// new RegExp(String.raw`...`) with only inner strings are escaped
export function regExpRaw(
  { raw }: TemplateStringsArray,
  ...params: string[]
): RegExp {
  tinyassert(raw.length === params.length + 1);
  return new RegExp(
    [...zip(raw, params.map(escapeRegExp)), raw.slice(-1)].flat().join("")
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
