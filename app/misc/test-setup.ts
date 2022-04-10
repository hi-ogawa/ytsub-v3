import { installGlobals } from "@remix-run/node";
import { beforeAll } from "vitest";

beforeAll(() => {
  installGlobals();
});
