import React from "react";

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

  getSnapshot = () => this.adapter.getSnapshot();

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
  getSnapshot: () => unknown;
  set: (value: T) => void;
}

class MemoryAdapter<T> implements SimpleStoreAdapter<T> {
  constructor(private value: T) {}
  get = () => this.value;
  getSnapshot = () => this.get();
  set = (value: T) => (this.value = value);
}

// - no multi-tab storage sync
// - ssr fallbacks to null which can cause hydration mismatch
// - cf. https://github.com/hi-ogawa/toy-metronome/blob/54b5f86f99432c698634de2976dda369cd829cb9/src/utils/storage.ts
class LocalStorageStoreAdapter<T> implements SimpleStoreAdapter<T> {
  constructor(
    private key: string,
    private defaultValue: T,
    private parse = JSON.parse,
    private stringify = JSON.stringify
  ) {}

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
