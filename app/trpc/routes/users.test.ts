import { describe, expect, it } from "vitest";
import { useUser } from "../../misc/test-helper";
import { getSessionUser } from "../../utils/auth";
import { getResponseSession } from "../../utils/session.server";
import { trpc } from "../client";
import { testTrpcClient, testTrpcClientWithContext } from "../test-helper";

describe(trpc.users_signin.mutationKey, () => {
  const credentials = { username: "test-trpc-signin", password: "correct" };
  const userHook = useUser(credentials);

  describe("success", () => {
    it("basic", async () => {
      const trpc = await testTrpcClientWithContext();
      const output = await trpc.caller.users_signin(credentials);
      expect(output).toEqual(userHook.data);

      // check session cookie in response header
      const sessionUser = await getSessionUser(
        await getResponseSession({ headers: trpc.ctx.resHeaders })
      );
      expect(sessionUser).toEqual(userHook.data);
    });
  });

  describe("error", () => {
    it("invalid username", async () => {
      const trpc = await testTrpcClient();
      await expect(
        trpc.users_signin({
          ...credentials,
          username: "wrong",
        })
      ).rejects.toMatchInlineSnapshot(
        "[TRPCError: Invalid username or password]"
      );
    });

    it("invalid password", async () => {
      const trpc = await testTrpcClient();
      await expect(
        trpc.users_signin({
          ...credentials,
          password: "wrong",
        })
      ).rejects.toMatchInlineSnapshot(
        "[TRPCError: Invalid username or password]"
      );
    });

    it("already signed in", async () => {
      const trpc = await testTrpcClient({ user: userHook.data });
      await expect(
        trpc.users_signin({
          ...credentials,
          password: "bad",
        })
      ).rejects.toMatchInlineSnapshot("[TRPCError: Already signed in]");
    });
  });
});

describe(trpc.users_signout.mutationKey, () => {
  const credentials = { username: "test-trpc-signout", password: "correct" };
  const userHook = useUser(credentials);

  describe("success", () => {
    it("basic", async () => {
      const trpc = await testTrpcClientWithContext({ user: userHook.data });
      await trpc.caller.users_signout(null);

      // check session cookie in response header
      const sessionUser = await getSessionUser(
        await getResponseSession({ headers: trpc.ctx.resHeaders })
      );
      expect(sessionUser).toBeUndefined();
    });
  });

  describe("error", () => {
    it("not signed in", async () => {
      const trpc = await testTrpcClient();
      await expect(trpc.users_signout(null)).rejects.toMatchInlineSnapshot(
        "[TRPCError: Not signed in]"
      );
    });
  });
});
