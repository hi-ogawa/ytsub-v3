import { Transition } from "@headlessui/react";
import { Form, useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { MoreVertical, Trash2 } from "react-feather";
import { z } from "zod";
import { Popover } from "../../../components/popover";
import {
  BookmarkEntryTable,
  DeckTable,
  PracticeEntryTable,
  Q,
  UserTable,
} from "../../../db/models";
import { assert } from "../../../misc/assert";
import { R } from "../../../misc/routes";
import { useToById } from "../../../utils/by-id";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { PageHandle } from "../../../utils/page-handle";
import { zStringToInteger } from "../../../utils/zod-utils";

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  NavBarMenuComponent,
};

// TODO
// - delete
// - show statistics

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
// action
//

export const action = makeLoader(Controller, async function () {
  assert(this.request.method === "DELETE");
  const [, deck] = await requireUserAndDeck.apply(this);
  await Q.decks().delete().where("id", deck.id);
  this.flash({ content: `Deck '${deck.name}' is deleted`, variant: "info" });
  return redirect(R["/decks"]);
});

//
// component
//

export default function DefaultComponent() {
  const { practiceEntries, bookmarkEntries }: LoaderData = useDeserialize(
    useLoaderData()
  );
  const bookmarkEntriesById = useToById(bookmarkEntries);

  // TODO: simple table layout?
  return (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          {practiceEntries.length === 0 && <div>Empty</div>}
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

//
// NavBarTitleComponent
//

function NavBarTitleComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());
  return <>{deck.name}</>;
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());

  return (
    <>
      <div className="flex-none">
        <Popover
          placement="bottom-end"
          reference={({ props }) => (
            <button
              className="btn btn-sm btn-ghost"
              data-test="user-menu"
              {...props}
            >
              <MoreVertical />
            </button>
          )}
          floating={({ open, props }) => (
            <Transition
              show={open}
              unmount={false}
              className="transition duration-200"
              enterFrom="scale-90 opacity-0"
              enterTo="scale-100 opacity-100"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-90 opacity-0"
              {...props}
            >
              <ul className="menu rounded p-3 shadow w-48 bg-base-100 text-base-content text-sm">
                <Form
                  action={R["/decks/$id"](deck.id) + "?index"}
                  method="delete"
                  onSubmitCapture={(e) => {
                    if (!window.confirm("Are you sure?")) {
                      e.preventDefault();
                    }
                  }}
                >
                  <li>
                    <button type="submit">
                      <Trash2 />
                      Delete
                    </button>
                  </li>
                </Form>
              </ul>
            </Transition>
          )}
        />
      </div>
    </>
  );
}
