"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  TinyStore: () => TinyStore,
  createTinyStore: () => createTinyStore,
  createTinyStoreWithStorage: () => createTinyStoreWithStorage,
  tinyStoreSelect: () => tinyStoreSelect,
  tinyStoreTransform: () => tinyStoreTransform
});
module.exports = __toCommonJS(src_exports);

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
function tinyStoreSelect(store, decode) {
  const decodeMemo = memoizeOne(decode);
  return {
    get: () => decodeMemo(store.get()),
    set: null,
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
function createTinyStore(defaultValue) {
  return new TinyStore(new TinyStoreMemoryAdapter(defaultValue));
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
var TinyStoreMemoryAdapter = class {
  constructor(value) {
    this.value = value;
  }
  get = () => this.value;
  set = (value) => this.value = value;
};

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TinyStore,
  createTinyStore,
  createTinyStoreWithStorage,
  tinyStoreSelect,
  tinyStoreTransform
});
