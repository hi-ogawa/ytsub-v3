import { QueueTypeIcon, requireUserAndDeck } from ".";
import { useLoaderData } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import React from "react";
import { CollapseTransition } from "../../../components/collapse";
import { PaginationComponent } from "../../../components/misc";
import {
  E,
  T,
  TT,
  db,
  toPaginationResult,
} from "../../../db/drizzle-client.server";
import type { DeckTable, PaginationMetadata } from "../../../db/models";
import { $R, ROUTE_DEF } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { dtf } from "../../../utils/intl";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import { MiniPlayer } from "../../bookmarks";
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

interface LoaderData {
  deck: DeckTable;
  rows: Pick<
    TT,
    "practiceActions" | "bookmarkEntries" | "captionEntries" | "videos"
  >[];
  pagination: PaginationMetadata;
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);

  const parsed = ROUTE_DEF["/decks/$id/history"].query.safeParse(this.query);
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect($R["/decks/$id/history"](deck));
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
      .innerJoin(
        T.captionEntries,
        E.eq(T.captionEntries.id, T.bookmarkEntries.captionEntryId)
      )
      .innerJoin(T.videos, E.eq(T.videos.id, T.captionEntries.videoId))
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
              <PracticeActionComponent key={row.practiceActions.id} {...row} />
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

function PracticeActionComponent(
  props: Pick<
    TT,
    "videos" | "captionEntries" | "bookmarkEntries" | "practiceActions"
  >
) {
  const { createdAt, actionType, queueType } = props.practiceActions;
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-col border">
      <div className="flex flex-col p-2 gap-2">
        <div className="flex gap-2">
          <div className="h-[20px] flex items-center">
            <QueueTypeIcon queueType={queueType} />
          </div>
          <div className="flex-1 text-sm" data-test="bookmark-entry-text">
            {props.bookmarkEntries.text}
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
          <button
            className={cls(
              "antd-btn antd-btn-ghost i-ri-arrow-down-s-line w-5 h-5",
              open && "rotate-180"
            )}
            onClick={() => setOpen(!open)}
          ></button>
        </div>
      </div>
      <CollapseTransition
        show={open}
        className="duration-300 h-0 overflow-hidden border-t border-dashed"
      >
        <div className="p-2 pt-0">
          <MiniPlayer
            video={props.videos}
            captionEntry={props.captionEntries}
            autoplay={true}
            defaultIsRepeating={true}
            highlight={{
              side: props.bookmarkEntries.side,
              offset: props.bookmarkEntries.offset,
              length: props.bookmarkEntries.text.length,
            }}
          />
        </div>
      </CollapseTransition>
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
