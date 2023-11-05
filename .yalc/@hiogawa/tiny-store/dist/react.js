// src/react.ts
import { useMemo, useSyncExternalStore } from "react";

// ../utils/dist/index.js
function tinyassert(value, message) {
  if (value) {
    return;
  }
  if (message instanceof Error) {
    throw message;
  }
  throw new TinyAssertionError(message, tinyassert);
}
var TinyAssertionError = class extends Error {
  constructor(message, stackStartFunction) {
    super(message);
    if (stackStartFunction && "captureStackTrace" in Error) {
      Error.captureStackTrace(this, stackStartFunction);
    }
  }
};
function subscribeEventListenerFactory(target) {
  return function subscribeEventListener(k, listener) {
    target.addEventListener(k, listener);
    return () => {
      target.removeEventListener(k, listener);
    };
  };
}

// src/core.ts
function tinyStoreTransform(store, decode, encode) {
  const decodeMemo = memoizeOne(decode);
  return {
    get: () => decodeMemo(store.get()),
    set: (v2) => {
      store.set((v1) => encode(applyAction(() => decodeMemo(v1), v2)));
    },
    subscribe: store.subscribe
  };
}
function memoizeOne(f) {
  let last;
  return function wrapper(arg) {
    if (!last || last.k !== arg) {
      last = { k: arg, v: f(arg) };
    }
    return last.v;
  };
}
var TinyStore = class {
  constructor(adapter) {
    this.adapter = adapter;
  }
  listeners = /* @__PURE__ */ new Set();
  get = () => this.adapter.get();
  set = (action) => {
    this.adapter.set(applyAction(this.get, action));
    this.notify();
  };
  subscribe = (listener) => {
    this.listeners.add(listener);
    const unsubscribeAdapter = this.adapter.subscribe?.(listener);
    return () => {
      unsubscribeAdapter?.();
      this.listeners.delete(listener);
    };
  };
  notify = () => {
    this.listeners.forEach((l) => l());
  };
};
function applyAction(v, action) {
  return typeof action === "function" ? action(v()) : action;
}

// src/local-storage.ts
function createTinyStoreWithStorage(key, defaultValue, parse = JSON.parse, stringify = JSON.stringify) {
  return tinyStoreTransform(
    new TinyStore(new TinyStoreLocalStorageAdapter(key)),
    (s) => s === null ? defaultValue : parse(s),
    (t) => stringify(t)
  );
}
var TinyStoreLocalStorageAdapter = class {
  constructor(key) {
    this.key = key;
  }
  get() {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage.getItem(this.key);
  }
  set(value) {
    if (value === null) {
      window.localStorage.removeItem(this.key);
    } else {
      window.localStorage.setItem(this.key, value);
    }
  }
  listeners = /* @__PURE__ */ new Set();
  subscribe = (listener) => {
    if (typeof window === "undefined") {
      return () => {
      };
    }
    this.listenInternal();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      this.unlistenInternal();
    };
  };
  // register actual event listener only once per store
  _unlisten;
  listenInternal() {
    if (this.listeners.size > 0) {
      return;
    }
    tinyassert(!this._unlisten);
    this._unlisten = subscribeEventListenerFactory(window)(
      "storage",
      (e) => {
        if (e.key === this.key || e.key === null) {
          this.listeners.forEach((f) => f());
        }
      }
    );
  }
  unlistenInternal() {
    if (this.listeners.size > 0) {
      return;
    }
    tinyassert(this._unlisten);
    this._unlisten();
    this._unlisten = void 0;
  }
};

// src/react.ts
function useTinyStore(store) {
  const value = useSyncExternalStore(store.subscribe, store.get, store.get);
  return [value, store.set];
}
function useTinyStoreStorage(key, defaultValue) {
  const store = useMemo(
    () => createTinyStoreWithStorage(key, defaultValue),
    [key]
  );
  return useTinyStore(store);
}
export {
  useTinyStore,
  useTinyStoreStorage
};
