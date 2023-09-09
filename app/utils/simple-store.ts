import React from "react";

// simple global state utilty via useSyncExternalStore
// TODO: move to utils-react?

export function useSimpleStore<T>(store: SimpleStore<T>) {
  React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return [store.get(), store.set] as const;
}

//
// platform agnostic store utility
//

export class SimpleStore<T> {
  constructor(private adapter: SimpleStoreAdapter<T>) {}

  static create<T>(value: T) {
    return new SimpleStore(new MemoryAdapter<T>(value));
  }

  static createWithLocalStorage<T>(key: string, value: T) {
    return new SimpleStore(new LocalStorageStoreAdapter(key, value));
  }

  get = () => this.adapter.get();

  set = (action: SetAction<T>) => {
    this.adapter.set(applyAction(this.get(), action));
    this.notify();
  };

  //
  // base api for React.useSyncExternalStore
  //

  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => {
    const adapter = this.adapter;
    return (adapter.getSnapshot ?? adapter.get).apply(adapter);
  };

  protected notify = () => {
    this.listeners.forEach((l) => l());
  };
}

type SetAction<T> = T | ((prev: T) => T);

function applyAction<T>(v: T, action: SetAction<T>): T {
  // @ts-expect-error it cannot narrow enough since `T` itself could be a function
  return typeof action === "function" ? action(v) : action;
}

//
// store adapter to abstract LocalStorage backend
//

interface SimpleStoreAdapter<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe?: (onStoreChange: () => void) => () => void;
  getSnapshot?: () => unknown;
}

class MemoryAdapter<T> implements SimpleStoreAdapter<T> {
  constructor(private value: T) {}
  get = () => this.value;
  set = (value: T) => (this.value = value);
}

// - no multi-tab storage sync
// - ssr fallbacks to `defaultValue` which can cause hydration mismatch
// - cf. https://github.com/hi-ogawa/toy-metronome/blob/54b5f86f99432c698634de2976dda369cd829cb9/src/utils/storage.ts
class LocalStorageStoreAdapter<T> implements SimpleStoreAdapter<T> {
  constructor(
    private key: string,
    private defaultValue: T,
    private parse = JSON.parse,
    private stringify = JSON.stringify
  ) {
    this.parse = memoizeOne(this.parse);
  }

  get() {
    const item = this.getSnapshot();
    return item === null ? this.defaultValue : this.parse(item);
  }

  getSnapshot() {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(this.key);
  }

  set(value: T) {
    window.localStorage.setItem(this.key, this.stringify(value));
  }
}

// make result stable for the same input i.e. memoize with cache size 1
function memoizeOne<F extends (arg: any) => any>(f: F): F {
  let last: { k: any; v: any } | undefined;
  return function wrapper(arg: any) {
    if (!last || last.k !== arg) {
      last = { k: arg, v: f(arg) };
    }
    return last.v;
  } as any;
}
