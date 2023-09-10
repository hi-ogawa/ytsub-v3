import { describe, expect, it, vi } from "vitest";
import { SimpleStore, createSimpleStore, storeTransform } from "./simple-store";

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

describe(storeTransform, () => {
  it("basic", () => {
    const store1 = createSimpleStore("0");
    const store2 = storeTransform<string, unknown>(
      store1,
      JSON.parse,
      JSON.stringify
    );

    const onStoreChangeFn1 = vi.fn();
    const unsubscribe1 = store1.subscribe(onStoreChangeFn1);
    const onStoreChangeFn2 = vi.fn();
    const unsubscribe2 = store2.subscribe(onStoreChangeFn2);

    expect(store1.get()).toMatchInlineSnapshot('"0"');
    expect(store2.get()).toMatchInlineSnapshot("0");
    expect(onStoreChangeFn1.mock.calls.length).toMatchInlineSnapshot("0");
    expect(onStoreChangeFn2.mock.calls.length).toMatchInlineSnapshot("0");

    store2.set(1);
    expect(store1.get()).toMatchInlineSnapshot('"1"');
    expect(store2.get()).toMatchInlineSnapshot("1");
    expect(onStoreChangeFn1.mock.calls.length).toMatchInlineSnapshot("1");
    expect(onStoreChangeFn2.mock.calls.length).toMatchInlineSnapshot("1");

    store1.set("2");
    expect(store1.get()).toMatchInlineSnapshot('"2"');
    expect(store2.get()).toMatchInlineSnapshot("2");
    expect(onStoreChangeFn1.mock.calls.length).toMatchInlineSnapshot("2");
    expect(onStoreChangeFn2.mock.calls.length).toMatchInlineSnapshot("2");

    unsubscribe2();
    store2.set(3);
    expect(store1.get()).toMatchInlineSnapshot('"3"');
    expect(store2.get()).toMatchInlineSnapshot("3");
    expect(onStoreChangeFn1.mock.calls.length).toMatchInlineSnapshot("3");
    expect(onStoreChangeFn2.mock.calls.length).toMatchInlineSnapshot("2");

    unsubscribe1();
  });
});
