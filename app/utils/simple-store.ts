import { DefaultMap } from "@hiogawa/utils";
import React from "react";

// simple global state utilty via useSyncExternalStore

export function useSimpleStore<TOut, TIn>(store: SimpleStore<TOut, TIn>) {
  React.useSyncExternalStore(store.subscribe, store.get, store.get);
  return [store.get(), store.set] as const;
}

//
// platform agnostic `SimpleStore` api
//

interface SimpleStore<TGet, TSet = TGet> {
  get: () => TGet;
  set: (newValue: SetAction<TSet>) => void;
  subscribe: (onStoreChange: () => void) => () => void;
}

// make result stable if the input is same as last (i.e. memoize with cache size 1)
function memoizeOne<F extends (arg: any) => any>(f: F): F {
  let last: { k: any; v: any } | undefined;
  return function wrapper(arg: any) {
    if (!last || last.k !== arg) {
      last = { k: arg, v: f(arg) };
    }
    return last.v;
  } as any;
}

// transform read/write (e.g. for JSON.parse/stringify based local storage)
export function storeTransform<T1, T2>(
  store: SimpleStore<T1>,
  decode: (v1: T1) => T2,
  encode: (v2: T2) => T1
): SimpleStore<T2> {
  const decodeMemo = memoizeOne(decode);
  return {
    get: () => decodeMemo(store.get()),
    set: (v2) => {
      // TODO: invalidate cache so that next `get` will see fresh data?
      store.set((v1) => encode(applyAction(() => decodeMemo(v1), v2)));
    },
    subscribe: store.subscribe,
  };
}

// transform readonly (for memoized selection)
export function storeSelect<T1, T2>(
  store: Omit<SimpleStore<T1, unknown>, "set">,
  decode: (v: T1) => T2
): SimpleStore<T2, never> {
  // `subscribe` based on original store, but as long as `get` returns memoized value,
  // `useSyncExternalStore` won't cause re-rendering
  const decodeMemo = memoizeOne(decode);
  return {
    get: () => decodeMemo(store.get()),
    set: () => {},
    subscribe: store.subscribe,
  };
}

//
// factory
//

export function createSimpleStore<T>(defaultValue: T): SimpleStore<T> {
  return new SimpleStoreBase(new MemoryAdapter<T>(defaultValue));
}

// ssr fallbacks to `defaultValue` which can cause hydration mismatch
export function createSimpleStoreWithLocalStorage<T>(
  key: string,
  defaultValue: T,
  parse = JSON.parse,
  stringify = JSON.stringify
): SimpleStore<T> {
  return storeTransform<string | null, T>(
    new SimpleStoreBase(new LocalStorageStoreAdapter(key)),
    (s: string | null): T => (s === null ? defaultValue : parse(s)),
    (t: T): string | null => stringify(t)
  );
}

//
// base store
//

export class SimpleStoreBase<T> implements SimpleStore<T> {
  private listeners = new Set<() => void>();

  constructor(private adapter: SimpleStoreAdapter<T>) {}

  get = () => this.adapter.get();

  set = (action: SetAction<T>) => {
    this.adapter.set(applyAction(this.get, action));
    this.notify();
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    const unsubscribeAdapter = this.adapter.subscribe?.(listener);
    return () => {
      unsubscribeAdapter?.();
      this.listeners.delete(listener);
    };
  };

  protected notify = () => {
    this.listeners.forEach((l) => l());
  };
}

type SetAction<T> = T | ((prev: T) => T);

function applyAction<T>(v: () => T, action: SetAction<T>): T {
  // it cannot narrow enough since `T` itself could be a function
  return typeof action === "function" ? (action as any)(v()) : action;
}

//
// adapter abstraction to support LocalStorage
//

interface SimpleStoreAdapter<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe?: (onStoreChange: () => void) => () => void;
}

class MemoryAdapter<T> implements SimpleStoreAdapter<T> {
  constructor(private value: T) {}
  get = () => this.value;
  set = (value: T) => (this.value = value);
}

class LocalStorageStoreAdapter implements SimpleStoreAdapter<string | null> {
  constructor(private key: string) {}

  get() {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(this.key);
  }

  subscribe = (listener: () => void) =>
    localStorageStore.subscribe(this.key, listener);

  set(value: string | null) {
    if (value === null) {
      window.localStorage.removeItem(this.key);
    } else {
      window.localStorage.setItem(this.key, value);
    }
  }
}

//
// global LocalStorage wrapper to listen "storage" event
// (based on https://github.com/hi-ogawa/toy-metronome/blob/54b5f86f99432c698634de2976dda369cd829cb9/src/utils/storage.ts)
//

class LocalStorageStore {
  private listeners = new DefaultMap<string, Set<() => void>>(() => new Set());

  init() {
    const handler = (e: StorageEvent) => {
      // null when clear
      if (e.key === null) {
        this.notifyAll();
      } else {
        this.notify(e.key);
      }
    };
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("storage", handler);
    };
  }

  subscribe(key: string, listener: () => void) {
    this.listeners.get(key).add(listener);
    return () => {
      this.listeners.get(key).delete(listener);
    };
  }

  private notify(key: string) {
    this.listeners.get(key).forEach((l) => l());
  }

  private notifyAll() {
    this.listeners.forEach((set) => set.forEach((l) => l()));
  }
}

// unique global instance
const localStorageStore = new LocalStorageStore();
if (typeof window !== "undefined") {
  localStorageStore.init();
}
