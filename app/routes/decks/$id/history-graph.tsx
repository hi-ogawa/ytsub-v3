import { DeckNavBarMenuComponent, requireUserAndDeck } from ".";
import { Transition } from "@headlessui/react";
import { Link, useMatches, useNavigate } from "@remix-run/react";
import type { ECharts } from "echarts";
import { range } from "lodash";
import React from "react";
import { transitionProps } from "../../../components/misc";
import {
  EchartsComponent,
  PRACTICE_HISTORY_DATASET_KEYS,
  PracticeHistoryChartDataEntry,
  PracticeHistoryChartDatasetKeys,
  practiceHistoryChartDataToEchartsOption,
} from "../../../components/practice-history-chart";
import { E, T, db } from "../../../db/drizzle-client.server";
import type { DeckTable } from "../../../db/models";
import { $R, ROUTE_DEF } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import { Timedelta } from "../../../utils/timedelta";
import { formatYmd } from "../../../utils/timezone";
import { toQuery } from "../../../utils/url-data";

// TODO: this page fails to dev auto reload due to server code sneaked into client?

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

// TODO
// - switch group (PracticeActionType or PracticeQueueType)
// - switch different date range (week or month)

interface LoaderData {
  deck: DeckTable;
  page: number;
  datasetSource: PracticeHistoryChartDataEntry[];
}

export const loader = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);

  const { page, now = new Date() } = ROUTE_DEF[
    "/decks/$id/history-graph"
  ].query.parse(this.query());
  const begin = Timedelta.make({ days: -7 * (page + 1) }).radd(now);
  const end = Timedelta.make({ days: -7 * page }).radd(now);

  // aggregate count in js
  const rows = await db
    .select()
    .from(T.practiceActions)
    .where(
      // prettier-ignore
      E.and(
        E.eq(T.practiceActions.deckId, deck.id),
        // extend range by 1 day to not miss data due to timezone offset
        E.gt(T.practiceActions.createdAt, Timedelta.make({ days: -1 }).radd(begin)),
        E.lt(T.practiceActions.createdAt, Timedelta.make({ days: 1 }).radd(end))
      )
    );

  const dates = range(7).map((i) =>
    formatYmd(Timedelta.make({ days: i + 1 }).radd(begin), user.timezone)
  );

  const countMap = Object.fromEntries(
    dates.map((date) => [
      date,
      Object.fromEntries(PRACTICE_HISTORY_DATASET_KEYS.map((key) => [key, 0])),
    ])
  ) as Record<string, Record<PracticeHistoryChartDatasetKeys, number>>;

  for (const row of rows) {
    const date = formatYmd(row.createdAt, user.timezone);
    if (!dates.includes(date)) {
      continue;
    }
    countMap[date]["total"]++;
    countMap[date][`queue-${row.queueType}`]++;
    countMap[date][`action-${row.actionType}`]++;
  }

  const datasetSource: PracticeHistoryChartDataEntry[] = dates.map((date) => ({
    date,
    ...countMap[date],
  }));

  const loaderData: LoaderData = { deck, page, datasetSource };
  return this.serialize(loaderData);
});

//
// DefaultComponent
//

export default function DefaultComponent() {
  const { page, datasetSource }: LoaderData = useDeserialize(
    useLeafLoaderData()
  );

  const [isLoading, setIsLoading] = React.useState(true);

  const [instance, setInstance] = React.useState<ECharts>();

  function setInstanceWrapper(instance?: ECharts) {
    if (instance) {
      instance.on("rendered", () => setIsLoading(false));
    }
    setInstance(instance);
  }

  function onClickPage() {
    // TODO: "hideTip" also when click outside of chart (on mobile)
    instance?.dispatchAction({ type: "hideTip" });
    setIsLoading(true);
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col gap-3 mt-2">
        <div className="relative w-full h-[300px]">
          <EchartsComponent
            className="w-full h-full"
            setInstance={setInstanceWrapper}
            option={practiceHistoryChartDataToEchartsOption(
              datasetSource,
              "action"
            )}
            optionDeps={datasetSource}
          />
          <Transition
            show={isLoading}
            className="duration-500 antd-body antd-spin-overlay-20"
            {...transitionProps("opacity-0", "opacity-100")}
          />
        </div>
        <div className="w-full flex justify-center">
          <div className="flex items-center gap-2 px-2 py-1">
            <Link
              to={"?" + toQuery({ page: page + 1 })}
              onClick={onClickPage}
              className="antd-btn antd-btn-ghost i-ri-play-mini-fill w-4 h-4 rotate-[180deg]"
            />
            <div className="text-sm px-2">{formatPage(page)}</div>
            <Link
              to={"?" + toQuery({ page: page - 1 })}
              onClick={onClickPage}
              className={cls(
                "antd-btn antd-btn-ghost i-ri-play-mini-fill w-4 h-4",
                page === 0 && "text-colorTextDisabled pointer-events-none"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPage(page: number): string {
  if (page === 0) return "this week";
  if (page === 1) return "last week";
  return `${page} weeks ago`;
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

//
// NavBarMenuComponent
//

export function DeckHistoryNavBarMenuComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());

  return (
    <>
      <HistoryViewSelect deckId={deck.id} />
      <DeckNavBarMenuComponent />
    </>
  );
}

function HistoryViewSelect({ deckId }: { deckId: number }) {
  const [{ pathname }] = useMatches().slice(-1);
  const navigate = useNavigate();

  const options = [
    {
      to: $R["/decks/$id/history-graph"]({ id: deckId }),
      label: "Chart",
    },
    {
      to: $R["/decks/$id/history"]({ id: deckId }),
      label: "List",
    },
  ];

  return (
    <select
      className="antd-input py-0.5 px-1 text-sm"
      value={pathname}
      onChange={(e) => {
        navigate(e.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option.to} value={option.to}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
