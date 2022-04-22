import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { z } from "zod";
import {
  BookmarkEntryTable,
  DeckTable,
  PracticeEntryTable,
  Q,
  UserTable,
} from "../../../db/models";
import { R } from "../../../misc/routes";
import { useToById } from "../../../utils/by-id";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { PageHandle } from "../../../utils/page-handle";
import { zStringToInteger } from "../../../utils/zod-utils";

export const handle: PageHandle = {
  navBarTitle: "Practice Decks", // TODO: Show deck name via `useLeafLoaderData`
};

// TODO
// - delete
// - show statistics
// - list practice entries

const PARAMS_SCHEMA = z.object({
  id: zStringToInteger,
});

export async function requireUserAndDeck(
  this: Controller
): Promise<[UserTable, DeckTable]> {
  const user = await this.requireUser();
  const parsed = PARAMS_SCHEMA.safeParse(this.args.params);
  if (parsed.success) {
    const { id } = parsed.data;
    const deck = await Q.decks().where({ id, userId: user.id }).first();
    if (deck) {
      return [user, deck];
    }
  }
  this.flash({ content: "Deck not found", variant: "error" });
  throw redirect(R["/decks"]);
}

//
// loader
//

interface LoaderData {
  deck: DeckTable;
  practiceEntries: PracticeEntryTable[]; // TODO: paginate
  bookmarkEntries: BookmarkEntryTable[];
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);
  const practiceEntries = await Q.practiceEntries()
    .where("deckId", deck.id)
    .orderBy("createdAt", "asc");
  const bookmarkEntries = await Q.bookmarkEntries().whereIn(
    "id",
    practiceEntries.map((e) => e.bookmarkEntryId)
  );
  const res: LoaderData = { deck, practiceEntries, bookmarkEntries };
  return this.serialize(res);
});

//
// component
//

export default function DefaultComponent() {
  const { practiceEntries, bookmarkEntries }: LoaderData = useDeserialize(
    useLoaderData()
  );
  const bookmarkEntriesById = useToById(bookmarkEntries);

  return (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          {practiceEntries.map((practiceEntry) => (
            <div
              key={practiceEntry.id}
              className="border border-gray-200 flex items-center p-2 gap-2"
            >
              <div className="grow pl-2">
                {bookmarkEntriesById.byId[practiceEntry.bookmarkEntryId].text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
