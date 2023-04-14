import { DeckNavBarMenuComponent, requireUserAndDeck } from ".";
import { Transition } from "@headlessui/react";
import { tinyassert } from "@hiogawa/utils";
import { Temporal } from "@js-temporal/polyfill";
import { Link, useMatches, useNavigate } from "@remix-run/react";
import type { ECharts } from "echarts";
import React from "react";
import type { z } from "zod";
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
import { fromTemporal, toZdt } from "../../../utils/temporal-utils";

// TODO: this page fails to dev auto reload due to server code sneaked into client?
// TODO: rename to "history-chart"

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

type QueryType = z.infer<
  (typeof ROUTE_DEF)["/decks/$id/history-graph"]["query"]
>;
type RangeType = QueryType["rangeType"];

interface LoaderData {
  deck: DeckTable;
  query: QueryType;
  datasetSource: PracticeHistoryChartDataEntry[];
}

export const loader = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);

  const query = ROUTE_DEF["/decks/$id/history-graph"].query.parse(this.query());
  const { rangeType, page, now = new Date() } = query;

  const { begin, end } = getDateRange(now, user.timezone, rangeType, page);

  // aggregate count in js
  const rows = await db
    .select()
    .from(T.practiceActions)
    .where(
      E.and(
        E.eq(T.practiceActions.deckId, deck.id),
        E.gt(T.practiceActions.createdAt, fromTemporal(begin)),
        E.lt(T.practiceActions.createdAt, fromTemporal(end))
      )
    );

  const dates = getZonedDateTimesBetween(begin, end).map((date) =>
    date.toPlainDate().toString()
  );

  const countMap = Object.fromEntries(
    dates.map((date) => [
      date,
      Object.fromEntries(PRACTICE_HISTORY_DATASET_KEYS.map((key) => [key, 0])),
    ])
  ) as Record<string, Record<PracticeHistoryChartDatasetKeys, number>>;

  for (const row of rows) {
    const date = toZdt(row.createdAt, user.timezone).toPlainDate().toString();
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

  const loaderData: LoaderData = { deck, query, datasetSource };
  return this.serialize(loaderData);
});

// TODO: move to temporal-utils
export function getDateRange(
  now: Date,
  timezone: string,
  type: RangeType,
  page: number
) {
  const today = toZdt(now, timezone).startOfDay();
  if (type === "week") {
    const thisWeek = today.subtract({ days: today.dayOfWeek - 1 });
    const begin = thisWeek.add({ weeks: -page });
    const end = begin.add({ weeks: 1 });
    return { begin, end };
  }
  if (type === "month") {
    const thisMonth = today.subtract({ days: today.day - 1 });
    const begin = thisMonth.add({ months: -page });
    const end = begin.add({ months: 1 });
    return { begin, end };
  }
  tinyassert(false, "unreachable");
}

export function getZonedDateTimesBetween(
  begin: Temporal.ZonedDateTime,
  end: Temporal.ZonedDateTime
): Temporal.ZonedDateTime[] {
  const result: Temporal.ZonedDateTime[] = [];
  for (let i = 0; Temporal.ZonedDateTime.compare(begin, end) < 0; i++) {
    // bound loop just in case
    if (i > 1000) {
      throw new Error("getDatesBetween");
    }
    result.push(begin);
    begin = begin.add({ days: 1 });
  }
  return result;
}

//
// DefaultComponent
//

export default function DefaultComponent() {
  const { deck, query, datasetSource }: LoaderData = useDeserialize(
    useLeafLoaderData()
  );
  const navigate = useNavigate();

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

  function mergeQuery(newQuery: Partial<QueryType>) {
    return $R["/decks/$id/history-graph"](deck, {
      ...query,
      ...newQuery,
    });
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
              query.graphType
            )}
            optionDeps={datasetSource}
            // TODO: workaround tooltip bugs when switching series
            key={query.graphType}
          />
          <Transition
            show={isLoading}
            className="duration-500 antd-body antd-spin-overlay-20"
            {...transitionProps("opacity-0", "opacity-100")}
          />
        </div>
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <Link
              to={mergeQuery({ page: query.page + 1 })}
              onClick={onClickPage}
              className="antd-btn antd-btn-ghost i-ri-play-mini-fill w-4 h-4 rotate-[180deg]"
            />
            <div className="text-sm px-2">{formatPage(query)}</div>
            <Link
              to={mergeQuery({ page: query.page - 1 })}
              onClick={onClickPage}
              className={cls(
                "antd-btn antd-btn-ghost i-ri-play-mini-fill w-4 h-4",
                query.page === 0 && "text-colorTextDisabled pointer-events-none"
              )}
            />
          </div>
          <div className="flex justify-center items-center gap-2">
            <SelectWrapper
              data-testid="SelectWrapper-rangeType"
              className="antd-input p-1"
              options={["week", "month"] as const}
              labelFn={(value) => `by ${value}`}
              value={query.rangeType}
              onChange={(rangeType) =>
                navigate(mergeQuery({ rangeType, page: 0 }))
              }
            />
            <SelectWrapper
              data-testid="SelectWrapper-graphType"
              className="antd-input p-1"
              options={["action", "queue"] as const}
              labelFn={(value) => `by ${value}`}
              value={query.graphType}
              onChange={(graphType) => navigate(mergeQuery({ graphType }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// TODO: to utils
export function SelectWrapper<T extends string>({
  value,
  options,
  onChange,
  labelFn,
  ...selectProps
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  labelFn?: (value: T) => React.ReactNode;
} & Omit<JSX.IntrinsicElements["select"], "value" | "onChange">) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(options[e.target.selectedIndex])}
      {...selectProps}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labelFn ? labelFn(option) : option}
        </option>
      ))}
    </select>
  );
}

export function formatPage({
  page,
  rangeType,
}: Pick<QueryType, "page" | "rangeType">): string {
  if (page === 0) return `this ${rangeType}`;
  if (page === 1) return `last ${rangeType}`;
  return `${page} ${rangeType}s ago`;
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
      data-testid="HistoryViewSelect"
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
