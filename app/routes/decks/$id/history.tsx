import { Transition } from "@hiogawa/tiny-transition/dist/react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";
import React from "react";
import { CollapseTransition } from "../../../components/collapse";
import { SelectWrapper, transitionProps } from "../../../components/misc";
import type { TT } from "../../../db/drizzle-client.server";
import { PRACTICE_ACTION_TYPES, PracticeActionType } from "../../../db/types";
import { ROUTE_DEF } from "../../../misc/routes";
import { rpcClientQuery } from "../../../trpc/client";
import { useIntersectionObserver } from "../../../utils/hooks-client-utils";
import { formatRelativeDate } from "../../../utils/intl";
import {
  disableUrlQueryRevalidation,
  useLeafLoaderData,
  useLoaderDataExtra,
  useUrlQuerySchema,
} from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import { MiniPlayer } from "../../bookmarks/_ui";
import { DeckNavBarMenuComponent, QueueTypeIcon } from "./_ui";
import { PRACTICE_ACTION_TYPE_TO_COLOR } from "./_utils";
import type { LoaderData } from "./_utils.server";

export { loader } from "./_utils.server";

export const shouldRevalidate = disableUrlQueryRevalidation;

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

export default function DefaultComponent() {
  const { deck } = useLoaderDataExtra() as LoaderData;

  const [urlQuery, setUrlQuery] = useUrlQuerySchema(
    ROUTE_DEF["/decks/$id/history"].query
  );

  const practiceActionsQuery = useInfiniteQuery({
    ...rpcClientQuery.decks_practiceActions.infiniteQueryOptions((context) => ({
      deckId: deck.id,
      actionType: urlQuery.actionType,
      practiceEntryId: urlQuery.practiceEntryId,
      cursor: context?.pageParam as any,
    })),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
  const rows = practiceActionsQuery.data?.pages.flatMap((res) => res.rows);

  const fecthNextIntersectionRef = useIntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      practiceActionsQuery.fetchNextPage();
    }
  });

  return (
    <>
      <div className="w-full flex justify-center">
        <div className="h-full w-full max-w-lg">
          <div className="h-full flex flex-col p-2 gap-2">
            <label className="flex items-center gap-2 py-1">
              Filter
              <SelectWrapper
                className="antd-input p-1"
                options={[undefined, ...PRACTICE_ACTION_TYPES]}
                value={urlQuery?.actionType}
                labelFn={(v) => v ?? "Select..."}
                onChange={(actionType) => setUrlQuery({ actionType })}
              />
            </label>
            <ActionStatisticsComponent
              deckId={deck.id}
              currentActionType={urlQuery?.actionType}
            />
            <div className="flex-1 flex flex-col gap-2 relative">
              {rows?.map((row) => (
                <PracticeActionComponent
                  key={row.practiceActions.id}
                  {...row}
                />
              ))}
              {practiceActionsQuery.hasNextPage && (
                <div className="flex justify-center">
                  <div className="antd-spin h-8"></div>
                </div>
              )}
              {/* auto load on scroll end */}
              {practiceActionsQuery.hasNextPage &&
                !practiceActionsQuery.isFetching && (
                  <div
                    ref={fecthNextIntersectionRef}
                    className="absolute -z-1 bottom-[100px]"
                  ></div>
                )}
              <Transition
                show={
                  practiceActionsQuery.isFetching &&
                  !practiceActionsQuery.isFetchingNextPage
                }
                className="absolute inset-0 duration-500 antd-body"
                {...transitionProps("opacity-0", "opacity-50")}
              >
                <div className="mx-auto mt-[200px] antd-spin h-18"></div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ActionStatisticsComponent({
  deckId,
  currentActionType,
}: {
  deckId: number;
  currentActionType?: PracticeActionType;
}) {
  const practiceStatisticsQuery = useQuery(
    rpcClientQuery.decks_practiceStatistics.queryOptions({ deckId })
  );

  return (
    <div
      data-testid="ActionStatisticsComponent"
      className="w-full flex items-center p-1 relative"
    >
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
        className="duration-500 antd-spin-overlay-6"
        {...transitionProps("opacity-0", "opacity-50")}
      />
    </div>
  );

  function renderItem(t: PracticeActionType) {
    const data = practiceStatisticsQuery.data;
    return (
      <div
        className={cls(
          "border-b border-transparent",
          PRACTICE_ACTION_TYPE_TO_COLOR[t],
          t === currentActionType && "!border-current"
        )}
      >
        {data?.daily.byActionType[t]} | {data?.total.byActionType[t]}
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
            className="flex-1 text-colorTextSecondary capitalize"
            suppressHydrationWarning
          >
            {formatRelativeDate(createdAt)}
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
            bookmarkEntries={[props.bookmarkEntries]}
            autoplay={autoplay}
            defaultIsRepeating={true}
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
  const { deck } = useLeafLoaderData() as LoaderData;
  return (
    <span>
      {deck.name}{" "}
      <span className="text-colorTextSecondary text-sm">(history)</span>
    </span>
  );
}
