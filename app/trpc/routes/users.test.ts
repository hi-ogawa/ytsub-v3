import { tinyassert } from "@hiogawa/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { E, T, db } from "../../db/drizzle-client.server";
import { useUser } from "../../misc/test-helper";
import { findByUsername, getSessionUser } from "../../utils/auth";
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
        await trpc.ctx.__getRepsonseSession()
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
        await trpc.ctx.__getRepsonseSession()
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

describe(trpc.users_register.mutationKey, () => {
  const credentials = {
    username: "test-trpc-register",
    password: "correct",
    passwordConfirmation: "correct",
    recaptchaToken: "",
    timezone: "+00:00",
  };

  beforeEach(async () => {
    await db
      .delete(T.users)
      .where(E.eq(T.users.username, credentials.username));
  });

  describe("success", () => {
    it("basic", async () => {
      const trpc = await testTrpcClientWithContext();
      await trpc.caller.users_register(credentials);

      const found = await findByUsername(credentials.username);
      tinyassert(found);
      expect(found.username).toBe(credentials.username);
      expect(found.timezone).toBe("+00:00");
      expect(found.createdAt).toEqual(found.updatedAt);
      expect(Math.abs(found.createdAt.getTime() - Date.now())).toBeLessThan(
        // ci flaky if 1000
        5000
      );

      // check session cookie in response header
      const sessionUser = await getSessionUser(
        await trpc.ctx.__getRepsonseSession()
      );
      expect(sessionUser).toEqual(found);
    });
  });

  describe("error", () => {
    it("username format", async () => {
      const trpc = await testTrpcClientWithContext();
      await expect(
        trpc.caller.users_register({
          ...credentials,
          username: "$invalid@format#",
        })
      ).rejects.toMatchInlineSnapshot(`
        [TRPCError: [
          {
            "validation": "regex",
            "code": "invalid_string",
            "message": "Invalid",
            "path": [
              "username"
            ]
          }
        ]]
      `);
    });

    it("password confirmation", async () => {
      const trpc = await testTrpcClientWithContext();
      await expect(
        trpc.caller.users_register({
          ...credentials,
          passwordConfirmation: "wrong",
        })
      ).rejects.toMatchInlineSnapshot(`
        [TRPCError: [
          {
            "code": "custom",
            "message": "Invalid",
            "path": [
              "passwordConfirmation"
            ]
          }
        ]]
      `);
    });

    it("unique username case insensitive", async () => {
      {
        const trpc = await testTrpcClientWithContext();
        await trpc.caller.users_register(credentials);
      }

      {
        const trpc = await testTrpcClientWithContext();
        await expect(
          trpc.caller.users_register(credentials)
        ).rejects.toMatchInlineSnapshot(
          "[TRPCError: Username 'test-trpc-register' is already taken]"
        );
      }

      {
        const trpc = await testTrpcClientWithContext();
        await expect(
          trpc.caller.users_register({
            ...credentials,
            username: "test-tRPC-REGISTER",
          })
        ).rejects.toMatchInlineSnapshot(
          "[TRPCError: Username 'test-tRPC-REGISTER' is already taken]"
        );
      }
    });
  });
});
