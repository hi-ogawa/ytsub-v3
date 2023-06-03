import { describe, expect, it } from "vitest";
import { pathToRegExp } from "./misc";

describe(pathToRegExp.name, () => {
  it("basic", () => {
    const re = pathToRegExp("/hello/:param/world");
    expect(re).toMatchInlineSnapshot(
      '/\\^\\\\/hello\\\\/\\(\\\\w\\+\\)\\\\/world\\$/'
    );
    expect("/hello/xxx/world".match(re)).toMatchInlineSnapshot(`
      [
        "/hello/xxx/world",
        "xxx",
      ]
    `);
    expect("/hello/world".match(re)).toMatchInlineSnapshot("null");
  });
});
