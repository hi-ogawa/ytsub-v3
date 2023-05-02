import { range } from "@hiogawa/utils";
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

export function zip<T1, T2>(ls1: T1[], ls2: T2[]): [T1, T2][] {
  return range(Math.min(ls1.length, ls2.length)).map((i) => [ls1[i], ls2[i]]);
}

export function difference<T>(ls1: T[], ls2: T[]): T[] {
  const exclude = new Set(ls2);
  return ls1.filter((e) => !exclude.has(e));
}

function findNext<T>(
  start: T,
  check: (value: T) => boolean,
  next: (value: T) => T | undefined
): T | undefined {
  let current: T | undefined = start;
  while (current) {
    if (check(current)) {
      return current;
    }
    current = next(current);
  }
  return;
}

export function findAncestorElement(
  el: Element,
  check: (el: Element) => boolean
): Element | undefined {
  return findNext(el, check, (el) => el.parentElement ?? undefined);
}
