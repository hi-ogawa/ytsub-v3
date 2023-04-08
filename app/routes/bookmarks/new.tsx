import { tinyassert } from "@hiogawa/utils";
import type { LoaderFunction } from "@remix-run/server-runtime";
import { sql } from "drizzle-orm";
import { deserialize } from "superjson";
import { z } from "zod";
import { E, T, db, findOne } from "../../db/drizzle-client.server";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";

//
// action
//

const Z_NEW_BOOKMARK = z.object({
  videoId: z.number().int(),
  captionEntryId: z.number().int(),
  text: z.string().nonempty(),
  side: z.union([z.literal(0), z.literal(1)]),
  offset: z.number().int(),
});

type NewBookmark = z.infer<typeof Z_NEW_BOOKMARK>;

export const action = makeLoader(Controller, async function () {
  const req = Z_NEW_BOOKMARK.parse(await this.request.json());

  const user = await this.currentUser();
  tinyassert(user);

  const found = await findOne(
    db
      .select()
      .from(T.captionEntries)
      .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
      .where(
        E.and(
          E.eq(T.captionEntries.id, req.captionEntryId),
          E.eq(T.videos.id, req.videoId),
          E.eq(T.videos.userId, user.id)
        )
      )
  );
  tinyassert(found, "not found");

  // insert with counter cache increment
  await db.insert(T.bookmarkEntries).values({
    ...req,
    userId: user.id,
  });
  await db
    .update(T.videos)
    .set({ bookmarkEntriesCount: sql`${T.videos.bookmarkEntriesCount} + 1` })
    .where(E.eq(T.videos.id, req.videoId));
  return null;
});

// client query
export function createNewBookmarkMutation() {
  const url = R["/bookmarks/new"];
  return {
    mutationKey: [url],
    mutationFn: async (req: NewBookmark) => {
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(req),
      });
      tinyassert(res.ok);
    },
  };
}

function defineQueryHandler<InputSchema extends z.ZodType<unknown>, Output>(
  inputSchema: InputSchema, handler: (args: { input: z.infer<InputSchema>, controller: Controller }) => Output
) {
  const loader = async (...args: Parameters<LoaderFunction>) => {
    const controller = await Controller.create(...args);
    const inputRaw = await controller.request.json();
    const input = inputSchema.parse(inputRaw);
    const output = await handler({ input, controller });
    return controller.serialize(output);
  };
  return loader as any as { __input: z.infer<InputSchema>, __output: Awaited<Output> };
}

function deriveClientMutation<QueryHandler extends { __input: unknown, __output: unknown }>(url: string) {
  return {
    mutationKey: [url],
    mutationFn: async (req: QueryHandler["__input"]): Promise<QueryHandler["__output"]> => {
      const res = await fetch(url, {
        method: "POST",
        body: JSON.stringify(req),
      });
      tinyassert(res.ok);
      return deserialize(await res.json());
    },
  };
}
