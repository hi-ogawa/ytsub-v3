import * as jsdom from "jsdom";

// It might be expensive so reuse single instance on development
// cf. https://github.com/remix-run/remix/blob/7a4279a513fb38fdea5b49a3a6ffa24dfbafcf16/examples/jokes/app/utils/db.server.ts

export let window: jsdom.DOMWindow;

declare global {
  var __DEV_WINDOW__: any;
}

if (!global.__DEV_WINDOW__) {
  global.__DEV_WINDOW__ = new jsdom.JSDOM("<!DOCTYPE html>").window;
}
window = global.__DEV_WINDOW__;
