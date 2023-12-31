import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { NavLink } from "@remix-run/react";
import { useQuery } from "@tanstack/react-query";
import { transitionProps } from "#components/misc";
import { PopoverSimple } from "#components/popover";
import { DeckTable } from "#db/models";
import { PracticeQueueType } from "#db/types";
import { $R } from "#misc/routes";
import {
  PRACTICE_QUEUE_TYPE_TO_COLOR,
  PRACTICE_QUEUE_TYPE_TO_ICON,
} from "#routes/decks/$id/_utils";
import { LoaderData } from "#routes/decks/$id/index.server";
import { rpcClientQuery } from "#trpc/client";
import { useLeafLoaderData } from "#utils/loader-utils";
import { cls } from "#utils/misc";

export function DeckNavBarMenuComponent() {
  const { deck } = useLeafLoaderData() as LoaderData;
  return <DeckMenuComponent deck={deck} />;
}

export function DeckMenuComponent({ deck }: { deck: DeckTable }) {
  const items = [
    {
      to: $R["/decks/$id/practice"](deck),
      children: (
        <>
          <span className="i-ri-play-line w-6 h-6"></span>
          Practice
        </>
      ),
    },
    {
      to: $R["/decks/$id/history"](deck),
      children: (
        <>
          <span className="i-ri-history-line w-6 h-6"></span>
          History
        </>
      ),
    },
    {
      to: $R["/decks/$id/history-graph"](deck),
      children: (
        <>
          <span className="i-ri-bar-chart-line w-6 h-6"></span>
          Chart
        </>
      ),
    },
    {
      to: $R["/decks/$id"](deck),
      children: (
        <>
          <span className="i-ri-book-line w-6 h-6"></span>
          Deck
        </>
      ),
    },
    {
      to: $R["/decks/$id/edit"](deck),
      children: (
        <>
          <span className="i-ri-edit-line w-6 h-6"></span>
          Edit
        </>
      ),
    },
  ];

  return (
    <PopoverSimple
      placement="bottom-end"
      reference={
        <button
          className="antd-btn antd-btn-ghost i-ri-more-2-line w-6 h-6"
          data-test="deck-menu-popover-reference"
        />
      }
      floating={(context) => (
        <ul
          className="flex flex-col gap-2 p-2 w-[180px] text-sm"
          data-test="deck-menu-popover-floating"
        >
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                className={({ isActive }) =>
                  cls(
                    "w-full antd-menu-item flex items-center gap-2 p-2",
                    isActive && "antd-menu-item-active"
                  )
                }
                end
                onClick={() => context.onOpenChange(false)}
                {...item}
              />
            </li>
          ))}
        </ul>
      )}
    />
  );
}

export function QueueStatisticsComponent({
  deckId,
  currentQueueType,
}: {
  deckId: number;
  currentQueueType?: PracticeQueueType;
}) {
  const practiceStatisticsQuery = useQuery(
    rpcClientQuery.decks_practiceStatistics.queryOptions({ deckId })
  );

  return (
    <div className="w-full flex items-center p-2 px-4">
      {/* TODO: help to explain what these numbers mean */}
      <div className="text-sm uppercase">Progress</div>
      <div className="flex-1 flex px-4 relative">
        <div className="flex-1" />
        {renderItem("NEW")}
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        {renderItem("LEARN")}
        <div className="flex-1 text-center text-colorTextSecondary">-</div>
        {renderItem("REVIEW")}
        <div className="flex-1" />
        <Transition
          show={practiceStatisticsQuery.isFetching}
          className="duration-500 antd-spin-overlay-6"
          {...transitionProps("opacity-0", "opacity-50")}
        />
      </div>
    </div>
  );

  function renderItem(type: PracticeQueueType) {
    const data = practiceStatisticsQuery.data;
    return (
      <div
        className={cls(
          "border-b border-transparent",
          PRACTICE_QUEUE_TYPE_TO_COLOR[type],
          type === currentQueueType && "!border-current"
        )}
      >
        {data?.daily.byQueueType[type]} | {data?.total.byQueueType[type]}
      </div>
    );
  }
}

export function QueueTypeIcon({ queueType }: { queueType: PracticeQueueType }) {
  return (
    <span
      // prettier-ignore
      className={cls(
        "w-5 h-5",
        PRACTICE_QUEUE_TYPE_TO_COLOR[queueType],
        PRACTICE_QUEUE_TYPE_TO_ICON[queueType]
      )}
    />
  );
}
