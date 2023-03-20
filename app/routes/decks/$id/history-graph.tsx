import { DeckNavBarMenuComponent, requireUserAndDeck } from ".";
import { Transition } from "@headlessui/react";
import { Link, useMatches, useNavigate } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import type { ECharts } from "echarts";
import { range } from "lodash";
import React from "react";
import { ChevronsLeft, ChevronsRight } from "react-feather";
import { z } from "zod";
import {
  PracticeHistoryChart,
  PracticeHistoryChartData,
} from "../../../components/practice-history-chart";
import { client } from "../../../db/client.server";
import { DeckTable, PracticeQueueType, Q } from "../../../db/models";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize, useHydrated } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import type { PageHandle } from "../../../utils/page-handle";
import { Timedelta } from "../../../utils/timedelta";
import { formatYmd } from "../../../utils/timezone";
import { toQuery } from "../../../utils/url-data";
import { zStringToInteger } from "../../../utils/zod-utils";

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
// - group by PracticeActionType
// - different date range (e.g. month, year)
const REQUEST_SCHEMA = z.object({
  page: zStringToInteger.optional().default("0"), // 0 => this week, 1 => last week, ...
  now: z.string().optional(), // currently only for testing
});

interface LoaderData {
  deck: DeckTable;
  page: number;
  data: PracticeHistoryChartData;
}

export const loader = makeLoader(Controller, async function () {
  const [user, deck] = await requireUserAndDeck.apply(this);

  const parsed = REQUEST_SCHEMA.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/decks/$id/history-graph"](deck.id));
  }

  const { page } = parsed.data;
  const now = parsed.data.now ? new Date(parsed.data.now) : new Date();
  const begin = Timedelta.make({ days: -7 * (page + 1) }).radd(now);
  const end = Timedelta.make({ days: -7 * page }).radd(now);

  const rows: { queueType: PracticeQueueType; date: string; count: number }[] =
    await Q.practiceActions()
      .select("queueType", {
        date: client.raw(
          "DATE_FORMAT(CONVERT_TZ(createdAt, '+00:00', ?), '%Y-%m-%d')",
          user.timezone
        ), // Date
        count: client.raw("COUNT(0)"), // number
      })
      .where("deckId", deck.id)
      .where("createdAt", ">", begin)
      .where("createdAt", "<=", end)
      .groupBy("date", "queueType");

  const dates = range(7)
    .reverse()
    .map((i) =>
      formatYmd(Timedelta.make({ days: i }).rsub(end), user.timezone)
    );

  const tmpData: {
    [date: string]: PracticeHistoryChartData[number];
  } = Object.fromEntries(
    dates.map((date) => [
      date,
      {
        date,
        total: 0,
        NEW: 0,
        LEARN: 0,
        REVIEW: 0,
      },
    ])
  );

  for (const row of rows) {
    if (row.date in tmpData) {
      tmpData[row.date].total += row.count;
      tmpData[row.date][row.queueType] = row.count;
    }
  }

  const res: LoaderData = { deck, page, data: Object.values(tmpData) };
  return this.serialize(res);
});

//
// DefaultComponent
//

export default function DefaultComponent() {
  const { data, page }: LoaderData = useDeserialize(useLeafLoaderData());

  // show loading between SSR and echarts "rendered" event
  const [isLoading, setIsLoading] = React.useState(!useHydrated());

  const [instance, setInstance] = React.useState<ECharts>();

  function setInstanceWrapper(instance: ECharts) {
    instance.on("rendered", () => setIsLoading(false));
    setInstance(instance);
  }

  function onClickPage() {
    // TODO: "hideTip" also when click outside of chart (on mobile)
    instance?.dispatchAction({ type: "hideTip" });
    setIsLoading(true);
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col gap-2">
        <div className="relative w-full h-[300px]">
          <PracticeHistoryChart
            data={data}
            setInstance={setInstanceWrapper}
            className="w-full h-full"
          />
          <Transition
            show={isLoading}
            className="transition duration-100 z-50 absolute inset-0 flex justify-center items-center bg-white/[0.5]"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="antd-spin w-20" />
          </Transition>
        </div>
        <div className="w-full flex justify-center">
          <div className="btn-group shadow-xl" data-test="pagination">
            <Link
              to={"?" + toQuery({ page: page + 1 })}
              onClick={onClickPage}
              className="btn btn-xs no-animation"
            >
              <ChevronsLeft size={14} />
            </Link>
            <div className="bg-neutral text-neutral-content font-semibold text-xs flex justify-center items-center px-2">
              {formatPage(page)}
            </div>
            <Link
              to={"?" + toQuery({ page: page - 1 })}
              onClick={onClickPage}
              className={`btn btn-xs no-animation ${
                page === 0 && "btn-disabled"
              }`}
            >
              <ChevronsRight size={14} />
            </Link>
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
      to: R["/decks/$id/history-graph"](deckId),
      label: "Chart",
    },
    {
      to: R["/decks/$id/history"](deckId),
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
