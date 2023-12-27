import { tinyassert } from "@hiogawa/utils";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { E, T, db } from "../../db/drizzle-client.server";
import { useUser } from "../../misc/test-helper";
import { zSnapshotType } from "../../misc/test-helper-snapshot";
import { mockRequestContext } from "../../server/request-context/mock";
import { ctx_get } from "../../server/request-context/storage";
import { findByUsername } from "../../utils/auth";
import { rpcRoutes } from "../server";

describe(rpcRoutes.users_signin, () => {
  const credentials = { username: "test-trpc-signin-v2", password: "correct" };
  const userHook = useUser(credentials);

  it("basic", async () => {
    await mockRequestContext()(async () => {
      const output = await rpcRoutes.users_signin(credentials);

      expect(
        z
          .object({
            id: zSnapshotType,
            createdAt: zSnapshotType,
            updatedAt: zSnapshotType,
          })
          .passthrough()
          .parse(output)
      ).toMatchInlineSnapshot(`
        {
          "createdAt": "[Date]",
          "email": null,
          "id": "[number]",
          "language1": null,
          "language2": null,
          "timezone": "+00:00",
          "updatedAt": "[Date]",
          "username": "test-trpc-signin-v2",
        }
      `);
      expect(output).toEqual(userHook.data);
      expect(ctx_get().session.user?.id).toBe(userHook.data.id);
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

describe(rpcRoutes.users_signout, () => {
  const credentials = { username: "test-trpc-signout", password: "correct" };
  const userHook = useUser(credentials);

  it("basic", async () => {
    await mockRequestContext({ user: userHook.data })(async () => {
      const output = await rpcRoutes.users_signout();
      expect(output).toMatchInlineSnapshot("undefined");
      expect(ctx_get().session.user?.id).toBe(undefined);
    });
  });

  it("error", async () => {
    await mockRequestContext()(async () => {
      await expect(rpcRoutes.users_signout()).rejects.toMatchInlineSnapshot(
        "[Error: Not signed in]"
      );
    });
  });
});

describe(rpcRoutes.users_register, () => {
  const credentials: Parameters<typeof rpcRoutes.users_register>[0] = {
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

  it("basic", async () => {
    await mockRequestContext()(async () => {
      const output = await rpcRoutes.users_register(credentials);
      expect(
        z
          .object({
            id: zSnapshotType,
            createdAt: zSnapshotType,
            updatedAt: zSnapshotType,
          })
          .passthrough()
          .parse(output)
      ).toMatchInlineSnapshot(`
        {
          "createdAt": "[Date]",
          "email": null,
          "id": "[number]",
          "language1": null,
          "language2": null,
          "timezone": "+00:00",
          "updatedAt": "[Date]",
          "username": "test-trpc-register",
        }
      `);

      const found = await findByUsername(credentials.username);
      tinyassert(found);
      expect(found).toEqual(output);
      expect(found.createdAt).toEqual(found.updatedAt);
      expect(Math.abs(found.createdAt.getTime() - Date.now())).toBeLessThan(
        // ci flaky if 1000
        5000
      );
      expect(ctx_get().session.user?.id).toBe(found.id);
    });
  });

  it("error username format", async () => {
    await mockRequestContext()(async () => {
      expect(() =>
        rpcRoutes.users_register({
          ...credentials,
          username: "$invalid@format#",
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        [Error: [
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
  });

  it("error password confirmation", async () => {
    await mockRequestContext()(async () => {
      expect(() =>
        rpcRoutes.users_register({
          ...credentials,
          passwordConfirmation: "wrong",
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        [Error: [
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
  });

  it("error password length short", async () => {
    await mockRequestContext()(async () => {
      expect(() =>
        rpcRoutes.users_register({
          ...credentials,
          password: "x",
          passwordConfirmation: "x",
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        [Error: [
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
  });

  it("error password confirmation", async () => {
    await mockRequestContext()(async () => {
      expect(() =>
        rpcRoutes.users_register({
          ...credentials,
          password: "x".repeat(200),
          passwordConfirmation: "x".repeat(200),
        })
      ).toThrowErrorMatchingInlineSnapshot(`
        [Error: [
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

  it("error unique case insensitive username", async () => {
    await mockRequestContext()(async () => {
      await rpcRoutes.users_register(credentials);
    });
    await mockRequestContext()(async () => {
      await expect(
        rpcRoutes.users_register(credentials)
      ).rejects.toMatchInlineSnapshot(
        "[Error: Username 'test-trpc-register' is already taken]"
      );

      await expect(
        rpcRoutes.users_register({
          ...credentials,
          username: "test-tRPC-REGISTER",
        })
      ).rejects.toMatchInlineSnapshot(
        "[Error: Username 'test-tRPC-REGISTER' is already taken]"
      );
    });
  });
});
