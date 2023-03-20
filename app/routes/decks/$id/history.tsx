import { requireUserAndDeck } from ".";
import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { CheckCircle, Circle, Disc } from "react-feather";
import { z } from "zod";
import { PaginationComponent } from "../../../components/misc";
import {
  DeckTable,
  PaginationMetadata,
  PracticeActionTable,
  Q,
  toPaginationResult,
} from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { dtf } from "../../../utils/intl";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import type { PageHandle } from "../../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../../utils/pagination";
import { zStringToInteger } from "../../../utils/zod-utils";
import { DeckHistoryNavBarMenuComponent } from "./history-graph";

//
// handle
//

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <DeckHistoryNavBarMenuComponent />,
};

//
// loader
//

const REQUEST_SCHEMA = z
  .object({
    practiceEntryId: zStringToInteger.optional(),
  })
  .merge(PAGINATION_PARAMS_SCHEMA);

type PracticeActionTableExtra = PracticeActionTable & {
  bookmarkEntryText: string;
};

interface LoaderData {
  deck: DeckTable;
  practiceActions: PracticeActionTableExtra[];
  pagination: PaginationMetadata;
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);

  const parsed = REQUEST_SCHEMA.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/decks/$id/history"](deck.id));
  }

  const qb = Q.practiceActions()
    .select("practiceActions.*", { bookmarkEntryText: "bookmarkEntries.text" })
    .join(
      "practiceEntries",
      "practiceEntries.id",
      "practiceActions.practiceEntryId"
    )
    .join(
      "bookmarkEntries",
      "bookmarkEntries.id",
      "practiceEntries.bookmarkEntryId"
    )
    .where("practiceActions.deckId", deck.id)
    .orderBy("practiceActions.createdAt", "desc");

  if (parsed.data.practiceEntryId) {
    qb.where("practiceEntryId", parsed.data.practiceEntryId);
  }

  const { data: practiceActions, ...pagination } = await toPaginationResult(
    qb,
    parsed.data
  );

  const res: LoaderData = { deck, practiceActions, pagination };
  return this.serialize(res);
});

//
// DefaultComponent
//

export default function DefaultComponent() {
  const { practiceActions, pagination }: LoaderData = useDeserialize(
    useLoaderData()
  );

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2">
            {practiceActions.length === 0 && <div>Empty</div>}
            {practiceActions.map((e) => (
              <PracticeActionComponent key={e.id} practiceAction={e} />
            ))}
          </div>
        </div>
      </div>
      <div className="w-full h-8" /> {/* fake padding to allow scrool more */}
      <div className="absolute bottom-2 w-full flex justify-center">
        <PaginationComponent pagination={pagination} />
      </div>
    </>
  );
}

function PracticeActionComponent(props: {
  practiceAction: PracticeActionTableExtra;
}) {
  const { bookmarkEntryText, createdAt, actionType, queueType } =
    props.practiceAction;
  return (
    <div className="flex flex-col p-2 gap-2 border border-gray-200">
      <div className="flex gap-2">
        <div className="flex-none h-[20px] flex items-center">
          {queueType === "NEW" && (
            <Circle size={16} className="text-blue-400" />
          )}
          {queueType === "LEARN" && <Disc size={16} className="text-red-300" />}
          {queueType === "REVIEW" && (
            <CheckCircle size={16} className="text-green-400" />
          )}
        </div>
        <div
          className="grow text-sm cursor-pointer"
          data-test="bookmark-entry-text"
        >
          {bookmarkEntryText}
        </div>
      </div>
      <div className="flex items-center ml-6 text-xs gap-3">
        <div className="flex-none bg-neutral text-neutral-content rounded-full py-0.5 w-14 text-center">
          {actionType}
        </div>
        <div className="text-gray-600">{dtf.format(createdAt)}</div>
      </div>
    </div>
  );
}

//
// NavBarTitleComponent
//

function NavBarTitleComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());
  return (
    <span>
      {deck.name}{" "}
      <span className="text-colorTextSecondary text-sm">(history)</span>
    </span>
  );
}
