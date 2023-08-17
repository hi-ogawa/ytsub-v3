import { tinyassert } from "@hiogawa/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { E, T, db } from "../../db/drizzle-client.server";
import { useUser } from "../../misc/test-helper";
import { mockRequestContext } from "../../server/request-context/mock";
import { ctx_get } from "../../server/request-context/storage";
import { findByUsername, getSessionUser } from "../../utils/auth";
import { getResponseSession } from "../../utils/session.server";
import { TrpcInputs, trpc } from "../client";
import { rpcRoutes } from "../server-v2";
import { testTrpcClient, testTrpcClientWithContext } from "../test-helper";

describe(rpcRoutes.users_signin.name, () => {
  const credentials = { username: "test-trpc-signin-v2", password: "correct" };
  const userHook = useUser(credentials);

  it("basic", async () => {
    await mockRequestContext()(async () => {
      const output = await rpcRoutes.users_signin(credentials);

      expect(Object.keys(output)).toMatchInlineSnapshot(`
        [
          "id",
          "createdAt",
          "updatedAt",
          "username",
          "email",
          "language1",
          "language2",
          "timezone",
        ]
      `);
      expect(output).toEqual(userHook.data);

      // check session cookie in response header
      const sessionUser = await getSessionUser(
        await getResponseSession({ headers: ctx_get().responseHeaders })
      );
      expect(sessionUser).toEqual(userHook.data);
    });
  });

  it("error invalid username", async () => {
    await mockRequestContext()(async () => {
      await expect(
        rpcRoutes.users_signin({
          ...credentials,
          username: "wrong",
        })
      ).rejects.toMatchInlineSnapshot("[Error: Invalid username or password]");
    });
  });

  it("error invalid password", async () => {
    await mockRequestContext()(async () => {
      await expect(
        rpcRoutes.users_signin({
          ...credentials,
          password: "wrong",
        })
      ).rejects.toMatchInlineSnapshot("[Error: Invalid username or password]");
    });
  });

  it("error already signed in", async () => {
    await mockRequestContext({ user: userHook.data })(async () => {
      await expect(
        rpcRoutes.users_signin(credentials)
      ).rejects.toMatchInlineSnapshot("[Error: Already signed in]");
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
  const credentials: TrpcInputs["users_register"] = {
    username: "test-trpc-register",
    password: "correct",
    passwordConfirmation: "correct",
    token: "dummy",
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

    describe("password length", () => {
      it("short", async () => {
        const trpc = await testTrpcClientWithContext();
        await expect(
          trpc.caller.users_register({
            ...credentials,
            password: "x",
            passwordConfirmation: "x",
          })
        ).rejects.toMatchInlineSnapshot(`
          [TRPCError: [
            {
              "code": "too_small",
              "minimum": 3,
              "type": "string",
              "inclusive": true,
              "exact": false,
              "message": "String must contain at least 3 character(s)",
              "path": [
                "password"
              ]
            }
          ]]
        `);
      });

      it("long", async () => {
        const trpc = await testTrpcClientWithContext();
        await expect(
          trpc.caller.users_register({
            ...credentials,
            password: "x".repeat(200),
            passwordConfirmation: "x".repeat(200),
          })
        ).rejects.toMatchInlineSnapshot(`
          [TRPCError: [
            {
              "code": "too_big",
              "maximum": 128,
              "type": "string",
              "inclusive": true,
              "exact": false,
              "message": "String must contain at most 128 character(s)",
              "path": [
                "password"
              ]
            }
          ]]
        `);
      });
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
