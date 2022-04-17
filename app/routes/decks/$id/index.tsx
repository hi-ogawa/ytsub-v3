import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import * as React from "react";
import { z } from "zod";
import { DeckTable, Q, UserTable } from "../../../db/models";
import { R } from "../../../misc/routes";
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
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);
  return this.serialize({ deck } as LoaderData);
});

//
// component
//

export default function DefaultComponent() {
  const { deck }: LoaderData = useDeserialize(useLoaderData());
  return (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">{deck.name}</div>
      </div>
    </div>
  );
}
