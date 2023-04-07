import { QueueTypeIcon, requireUserAndDeck } from ".";
import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { z } from "zod";
import { PaginationComponent } from "../../../components/misc";
import {
  E,
  T,
  TT,
  db,
  toPaginationResult,
} from "../../../db/drizzle-client.server";
import type {
  BookmarkEntryTable,
  DeckTable,
  PaginationMetadata,
  PracticeActionTable,
} from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { dtf } from "../../../utils/intl";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import type { PageHandle } from "../../../utils/page-handle";
import { PAGINATION_PARAMS_SCHEMA } from "../../../utils/pagination";
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
    practiceEntryId: z.coerce.number().int().optional(),
  })
  .merge(PAGINATION_PARAMS_SCHEMA);

interface LoaderData {
  deck: DeckTable;
  rows: Pick<TT, "practiceActions" | "bookmarkEntries">[];
  pagination: PaginationMetadata;
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);

  const parsed = REQUEST_SCHEMA.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/decks/$id/history"](deck.id));
  }

  const [rows, pagination] = await toPaginationResult(
    db
      .select()
      .from(T.practiceActions)
      .innerJoin(
        T.practiceEntries,
        E.eq(T.practiceEntries.id, T.practiceActions.practiceEntryId)
      )
      .innerJoin(
        T.bookmarkEntries,
        E.eq(T.bookmarkEntries.id, T.practiceEntries.bookmarkEntryId)
      )
      .where(
        E.and(
          E.eq(T.practiceActions.deckId, deck.id),
          parsed.data.practiceEntryId
            ? E.eq(
                T.practiceActions.practiceEntryId,
                parsed.data.practiceEntryId
              )
            : undefined
        )
      )
      .orderBy(E.desc(T.practiceActions.createdAt)),
    parsed.data
  );

  const res: LoaderData = { deck, rows, pagination };
  return this.serialize(res);
});

//
// DefaultComponent
//

export default function DefaultComponent() {
  const { rows, pagination }: LoaderData = useDeserialize(useLoaderData());

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2">
            {rows.length === 0 && <div>Empty</div>}
            {rows.map((row) => (
              <PracticeActionComponent
                key={row.practiceActions.id}
                practiceAction={row.practiceActions}
                bookmarkEntry={row.bookmarkEntries}
              />
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
  practiceAction: PracticeActionTable;
  bookmarkEntry: BookmarkEntryTable;
}) {
  const { createdAt, actionType, queueType } = props.practiceAction;
  return (
    <div className="flex flex-col p-2 gap-2 border">
      <div className="flex gap-2">
        <div className="h-[20px] flex items-center">
          <QueueTypeIcon queueType={queueType} />
        </div>
        <div className="flex-1 text-sm" data-test="bookmark-entry-text">
          {props.bookmarkEntry.text}
        </div>
      </div>
      <div className="flex items-center ml-6 text-xs gap-3">
        <div className="border rounded-full px-2 py-0.5 w-14 text-center">
          {actionType}
        </div>
        <div
          className="flex-1 text-colorTextSecondary"
          suppressHydrationWarning
        >
          {dtf.format(createdAt)}
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
  return (
    <span>
      {deck.name}{" "}
      <span className="text-colorTextSecondary text-sm">(history)</span>
    </span>
  );
}
