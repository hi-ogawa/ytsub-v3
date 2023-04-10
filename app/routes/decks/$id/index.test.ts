import { describe, expect, it } from "vitest";
import { testLoader, useUser } from "../../../misc/test-helper";
import { loader } from "./index";

describe("decks/id.loader", () => {
  const { signin } = useUser({
    seed: __filename,
  });

  it("basic", async () => {
    await expect(
      testLoader(loader, { params: { id: "9999" }, transform: signin })
    ).rejects.toBeInstanceOf(Response);
  });
});
