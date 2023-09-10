import { DefaultMap } from "@hiogawa/utils";
import React from "react";

// simple global state utilty via useSyncExternalStore
// TODO: move to utils-react?

export function useSimpleStore<T>(store: StoreApi<T>) {
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

interface StoreApi<T> {
  get: () => T;
  set: (newValue: SetAction<T>) => void;
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => unknown;
}

export function storeTransform<T1, T2>(
  base: StoreApi<T1>,
  read: (v: T1) => T2,
  write: (v: T2) => T1
): StoreApi<T2> {
  read = memoizeOne(read);
  return {
    get: () => read(base.get()),
    set: (v2) => base.set((v1) => write(applyAction(() => read(v1), v2))),
    subscribe: base.subscribe,
    getSnapshot: base.getSnapshot,
  };
}

// TODO: readonly transform (for memoized selection)
// export function storeTransformReadonly<T1, T2>(
//   base: StoreApi<T1, unknown>,
//   read: (v: T1) => T2
// ): StoreApi<T2, undefined> {
//   read = memoizeOne(read)
//   return {
//     get: () => read(base.get()),
//     set: () => {},
//     subscribe: base.subscribe,
//     getSnapshot: base.getSnapshot,
//   };
// }

// TODO: writeonly transform (for no re-render)
// export function storeTransformWriteonly<T1, T2>(
//   base: StoreApi<unknown, T1>,
//   write: (v: T2) => T1
// ): StoreApi<undefined, T2> {
//   return {
//     get: () => {},
//     set: (v) => base.set(write(v)),
//     subscribe: () => () => {},
//     getSnapshot: () => {},
//   };
// }


//
// base store
//

export function createSimpleStore<T>(defaultValue: T) {
  return new SimpleStore(new MemoryAdapter<T>(defaultValue));
}

export function createSimpleStoreWithLocalStorage<T>(
  key: string,
  defaultValue: T
) {
  return new SimpleStore(new LocalStorageStoreAdapter(key, defaultValue));
}

// TODO: rename to SimpleStoreBase?
class SimpleStore<T> implements StoreApi<T> {
  constructor(private adapter: SimpleStoreAdapter<T>) {}

  get = () => this.adapter.get();

  set = (action: SetAction<T>) => {
    this.adapter.set(applyAction(this.get, action));
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

function applyAction<T>(v: () => T, action: SetAction<T>): T {
  // it cannot narrow enough since `T` itself could be a function
  return typeof action === "function" ? (action as any)(v()) : action;
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

// ssr fallbacks to `defaultValue` which can cause hydration mismatch
class LocalStorageStoreAdapter<T> implements SimpleStoreAdapter<T> {
  constructor(
    private key: string,
    private defaultValue: T,
    // TODO: this "deriving" part should live as "selector" feature?
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
// (copied from https://github.com/hi-ogawa/toy-metronome/blob/54b5f86f99432c698634de2976dda369cd829cb9/src/utils/storage.ts)
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
