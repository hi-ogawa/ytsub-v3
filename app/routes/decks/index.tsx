import { Link, useLoaderData } from "@remix-run/react";
import { Book, Play, PlusSquare } from "react-feather";
import { DeckTable, Q } from "../../db/models";
import { R } from "../../misc/routes";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { useDeserialize } from "../../utils/hooks";
import { PageHandle } from "../../utils/page-handle";

export const handle: PageHandle = {
  navBarTitle: () => "Practice Decks",
  navBarMenu: () => <NavBarMenuComponent />,
};

//
// loader
//

// TODO: more data (e.g. deck statistics, etc...)
export interface DecksLoaderData {
  decks: DeckTable[];
}

export const loader = makeLoader(Controller, async function () {
  const user = await this.requireUser();
  const decks = await Q.decks()
    .where({ userId: user.id })
    .orderBy("createdAt", "desc");
  return this.serialize({ decks } as DecksLoaderData);
});

//
// component
//

export default function DefaultComponent() {
  const data: DecksLoaderData = useDeserialize(useLoaderData());
  const { decks } = data;
  return (
    <div className="w-full flex justify-center">
      <div className="h-full w-full max-w-lg">
        <div className="h-full flex flex-col p-2 gap-2">
          {decks.length === 0 && <div>Empty</div>}
          {decks.map((deck) => (
            <DeckComponent key={deck.id} deck={deck} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DeckComponent({ deck }: { deck: DeckTable }) {
  return (
    <div className="relative border border-gray-200 flex items-center p-2 gap-2">
      <Link to={R["/decks/$id"](deck.id)} className="grow pl-2">
        {deck.name}
      </Link>
      <Link
        to={R["/decks/$id"](deck.id)}
        className="flex-none btn btn-circle btn-sm btn-ghost"
      >
        <Book size={16} />
      </Link>
      <Link
        to={R["/decks/$id/practice"](deck.id)}
        className="flex-none btn btn-circle btn-sm btn-ghost"
      >
        <Play size={16} />
      </Link>
    </div>
  );
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  return (
    <>
      <div className="flex-none">
        <Link
          to={R["/decks/new"]}
          className="btn btn-sm btn-ghost"
          data-test="new-deck-link"
        >
          <PlusSquare />
        </Link>
      </div>
    </>
  );
}
