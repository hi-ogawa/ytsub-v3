import { Link } from "@remix-run/react";
import type { DeckTable } from "../../db/models";
import { $R } from "../../misc/routes";
import { useLoaderDataExtra } from "../../utils/loader-utils";
import type { PageHandle } from "../../utils/page-handle";
import { DeckMenuComponent } from "./$id/_ui";
import type { DecksLoaderData } from "./index.server";
export { loader } from "./index.server";

export const handle: PageHandle = {
  navBarTitle: () => "Practice Decks",
  navBarMenu: () => <NavBarMenuComponent />,
};

export default function DefaultComponent() {
  const data = useLoaderDataExtra() as DecksLoaderData;
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
    <div className="relative border flex items-center p-2 gap-3">
      <Link to={$R["/decks/$id/practice"](deck)} className="flex-1 pl-2">
        {deck.name}
      </Link>
      <DeckMenuComponent deck={deck} />
    </div>
  );
}

//
// NavBarMenuComponent
//

function NavBarMenuComponent() {
  return (
    <>
      <Link
        to={$R["/decks/new"]()}
        className="antd-btn antd-btn-ghost i-ri-add-box-line w-6 h-6"
        data-test="new-deck-link"
      />
      <Link
        to={$R["/decks/import"]()}
        className="antd-btn antd-btn-ghost i-ri-file-upload-line w-6 h-6"
      />
    </>
  );
}
