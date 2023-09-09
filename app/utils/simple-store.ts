import { DefaultMap } from "@hiogawa/utils";
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
    const unsubscribeAdapter = this.adapter.subscribe?.(listener);
    return () => {
      unsubscribeAdapter?.();
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

  subscribe = (listener: () => void) =>
    localStorageStore.subscribe(this.key, listener);

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

//
// LocalStorage wrapper to synchronize on changes (either "storage" event or "set/remove" on same runtime)
//

class LocalStorageStore {
  listen() {
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

  get(key: string): string | null {
    return window.localStorage.getItem(key);
  }

  set(key: string, data: string) {
    window.localStorage.setItem(key, data);
    this.notify(key);
  }

  remove(key: string) {
    window.localStorage.removeItem(key);
    this.notify(key);
  }

  private listeners = new DefaultMap<string, Set<() => void>>(() => new Set());

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
  localStorageStore.listen();
}
