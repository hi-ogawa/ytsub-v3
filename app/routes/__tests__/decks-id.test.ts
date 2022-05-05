import { describe, expect, it } from "vitest";
import { loader } from "../decks/$id";
import { testLoader, useUser } from "./helper";

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
