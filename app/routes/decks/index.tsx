import { Transition } from "@headlessui/react";
import { Link, useLoaderData } from "@remix-run/react";
import * as React from "react";
import { MoreVertical, Play, PlusSquare, Settings } from "react-feather";
import { Popover } from "../../components/popover";
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
        <Settings size={16} />
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
        <Popover
          placement="bottom-end"
          reference={({ props }) => (
            <button
              className="btn btn-sm btn-ghost"
              data-test="decks-menu"
              {...props}
            >
              <MoreVertical />
            </button>
          )}
          floating={({ open, setOpen, props }) => (
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
                <li>
                  <Link to={R["/decks/new"]} onClick={() => setOpen(false)}>
                    <PlusSquare />
                    New deck
                  </Link>
                </li>
              </ul>
            </Transition>
          )}
        />
      </div>
    </>
  );
}
