import React from "react";

// TODO: move to utils-react?

export function useSimpleStore<T>(store: SimpleStore<T>) {
  React.useSyncExternalStore(store.subscribe, store.get, store.get);
  return [store.get(), store.set] as const;
}

//
// platform agnostic store utility
//

// TODO: composition (derive etc...)
// TODO: localstorage backend

export class SimpleStore<T> {
  constructor(private value: T) {}

  get = () => this.value;

  set = (action: T | ((prev: T) => T)) => {
    this.value = applyAction(this.value, action);
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

  private notify = () => {
    this.listeners.forEach((l) => l());
  };
}

function applyAction<T>(v: T, action: T | ((v: T) => T)): T {
  // @ts-expect-error it cannot narrow enough since `T` itself could be a function
  return typeof action === "function" ? action(v) : action;
}
