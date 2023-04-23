import {
  PRACTICE_ACTION_TYPE_TO_COLOR,
  QueueTypeIcon,
  requireUserAndDeck,
} from ".";
import { Transition } from "@headlessui/react";
import { mapOption } from "@hiogawa/utils";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import type { z } from "zod";
import { CollapseTransition } from "../../../components/collapse";
import {
  PaginationComponent,
  SelectWrapper,
  transitionProps,
} from "../../../components/misc";
import {
  E,
  T,
  TT,
  db,
  toPaginationResult,
} from "../../../db/drizzle-client.server";
import type { DeckTable, PaginationMetadata } from "../../../db/models";
import { PRACTICE_ACTION_TYPES, PracticeActionType } from "../../../db/types";
import { $R, ROUTE_DEF } from "../../../misc/routes";
import { trpc } from "../../../trpc/client";
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
  query: z.infer<(typeof ROUTE_DEF)["/decks/$id/history"]["query"]>;
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);

  const parsed = ROUTE_DEF["/decks/$id/history"].query.safeParse(this.query());
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
          mapOption(parsed.data.actionType, (t) =>
            E.eq(T.practiceActions.actionType, t)
          ),
          mapOption(parsed.data.practiceEntryId, (t) =>
            E.eq(T.practiceActions.practiceEntryId, t)
          )
        )
      )
      .orderBy(E.desc(T.practiceActions.createdAt)),
    parsed.data
  );

  const res: LoaderData = { deck, rows, pagination, query: parsed.data };
  return this.serialize(res);
});

//
// DefaultComponent
//

export default function DefaultComponent() {
  const { deck, rows, pagination, query }: LoaderData = useDeserialize(
    useLoaderData()
  );
  const navigate = useNavigate();

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2">
            <div className="flex items-center gap-2 py-1">
              Filter
              <SelectWrapper
                className="antd-input p-1"
                options={[undefined, ...PRACTICE_ACTION_TYPES]}
                value={query.actionType}
                labelFn={(v) => v ?? "Select..."}
                onChange={(actionType) => {
                  navigate(
                    $R["/decks/$id/history"](
                      { id: deck.id },
                      actionType ? { actionType } : {}
                    )
                  );
                }}
              />
            </div>
            <ActionStatisticsComponent deckId={deck.id} />
            {rows.length === 0 && <div>Empty</div>}
            {rows.map((row) => (
              <PracticeActionComponent key={row.practiceActions.id} {...row} />
            ))}
          </div>
        </div>
      </div>
      <div className="w-full h-8" /> {/* padding for scroll */}
      <div className="absolute bottom-2 w-full flex justify-center">
        <PaginationComponent pagination={pagination} />
      </div>
    </>
  );
}

function ActionStatisticsComponent({ deckId }: { deckId: number }) {
  const practiceStatisticsQuery = useQuery(
    trpc.decks_practiceStatistics.queryOptions({ deckId })
  );

  return (
    <div className="w-full flex items-center p-1 relative">
      <div className="grow flex px-4">
        <div className="flex-1" />
        {renderItem("AGAIN")}
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        {renderItem("HARD")}
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        {renderItem("GOOD")}
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        {renderItem("EASY")}
        <div className="flex-1" />
      </div>
      <Transition
        show={practiceStatisticsQuery.isFetching}
        className="duration-500 antd-body antd-spin-overlay-6"
        {...transitionProps("opacity-0", "opacity-50")}
      />
    </div>
  );

  function renderItem(type: PracticeActionType) {
    const data = practiceStatisticsQuery.data;
    return (
      <div
        className={cls(
          "border-b border-transparent",
          PRACTICE_ACTION_TYPE_TO_COLOR[type]
        )}
      >
        {data?.daily.byActionType[type]} | {data?.total.byActionType[type]}
      </div>
    );
  }
}

function PracticeActionComponent(
  props: Pick<
    TT,
    "videos" | "captionEntries" | "bookmarkEntries" | "practiceActions"
  >
) {
  const { createdAt, actionType, queueType } = props.practiceActions;
  const [open, setOpen] = React.useState(false);
  const [autoplay, setAutoplay] = React.useState(false);

  return (
    <div className="flex flex-col border">
      <div className="flex flex-col p-2 gap-2">
        <div
          className="flex gap-2 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          <div className="h-[20px] flex items-center">
            <QueueTypeIcon queueType={queueType} />
          </div>
          <div className="flex-1 text-sm" data-test="bookmark-entry-text">
            {props.bookmarkEntries.text}
          </div>
        </div>
        <div className="flex items-center ml-6 text-xs gap-3">
          <div
            className={cls(
              "rounded-full px-1 py-0.3 w-13 text-center border !border-current",
              PRACTICE_ACTION_TYPE_TO_COLOR[actionType]
            )}
          >
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
            onClick={() => {
              setAutoplay(true);
              setOpen(!open);
            }}
          ></button>
        </div>
      </div>
      <CollapseTransition
        show={open}
        className="duration-300 overflow-hidden border-t border-dashed"
      >
        <div className="p-2 pt-0">
          <MiniPlayer
            video={props.videos}
            captionEntry={props.captionEntries}
            autoplay={autoplay}
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
