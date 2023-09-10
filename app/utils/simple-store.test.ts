import { describe, expect, it, vi } from "vitest";
import { SimpleStore, createSimpleStore } from "./simple-store";

describe(SimpleStore, () => {
  it("basic", () => {
    const store = createSimpleStore(0);
    const onStoreChangeFn = vi.fn();
    const unsubscribe = store.subscribe(onStoreChangeFn);

    expect(store.get()).toMatchInlineSnapshot("0");
    expect(onStoreChangeFn.mock.calls.length).toMatchInlineSnapshot("0");

    store.set(1);
    expect(store.get()).toMatchInlineSnapshot("1");
    expect(onStoreChangeFn.mock.calls.length).toMatchInlineSnapshot("1");

    unsubscribe();
    store.set(2);
    expect(store.get()).toMatchInlineSnapshot("2");
    expect(onStoreChangeFn.mock.calls.length).toMatchInlineSnapshot("1");
  });
});
