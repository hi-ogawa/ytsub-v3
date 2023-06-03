import { describe, expect, it } from "vitest";
import { pathToRegExp } from "./misc";

describe(pathToRegExp.name, () => {
  it("basic", () => {
    const result = pathToRegExp("/hello/:param/world");
    expect(result).toMatchInlineSnapshot(`
      {
        "keys": [
          "param",
        ],
        "regexp": /\\^\\\\/hello\\\\/\\(\\\\w\\+\\)\\\\/world\\$/,
      }
    `);
    expect("/hello/xxx/world".match(result.regexp)).toMatchInlineSnapshot(`
      [
        "/hello/xxx/world",
        "xxx",
      ]
    `);
    expect("/hello/world".match(result.regexp)).toMatchInlineSnapshot("null");
  });
});
