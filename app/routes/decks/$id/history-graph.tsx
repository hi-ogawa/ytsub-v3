import { Transition } from "@headlessui/react";
import { Link } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import type { ECharts } from "echarts";
import { range } from "lodash";
import * as React from "react";
import {
  BarChart2,
  ChevronsLeft,
  ChevronsRight,
  List,
  MoreVertical,
  Play,
} from "react-feather";
import { z } from "zod";
import { Spinner } from "../../../components/misc";
import { Popover } from "../../../components/popover";
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
import { PageHandle } from "../../../utils/page-handle";
import { Timedelta } from "../../../utils/timedelta";
import { formatYmd, getMinutesOffset } from "../../../utils/timezone";
import { toQuery } from "../../../utils/url-data";
import { zStringToInteger } from "../../../utils/zod-utils";
import { requireUserAndDeck } from ".";

//
// handle
//

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <NavBarMenuComponent />,
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
            <Spinner className="w-20 h-20" />
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
  return <>{deck.name} (history)</>;
}

//
// NavBarMenuComponent
//

export function NavBarMenuComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());

  return (
    <>
      <div className="flex-none">
        <Popover
          placement="bottom-end"
          reference={({ props }) => (
            <button
              className="btn btn-sm btn-ghost"
              data-test="deck-menu-popover-reference"
              {...props}
            >
              <MoreVertical />
            </button>
          )}
          floating={({ open, setOpen, props }) => (
            <Transition
              show={open}
              unmount={false}
              className="transition duration-200"
              enterFrom="scale-90 opacity-0"
              enterTo="scale-100 opacity-100"
              leaveFrom="scale-100 opacity-100"
              leaveTo="scale-90 opacity-0"
              {...props}
            >
              <ul
                className="menu menu-compact rounded p-3 shadow w-48 bg-base-100 text-base-content text-sm"
                data-test="deck-menu-popover-floating"
              >
                <li>
                  <Link
                    to={R["/decks/$id/practice"](deck.id)}
                    onClick={() => setOpen(false)}
                  >
                    <Play />
                    Practice
                  </Link>
                </li>
                <li>
                  <Link
                    to={R["/decks/$id/history-graph"](deck.id)}
                    onClick={() => setOpen(false)}
                  >
                    <BarChart2 />
                    Graph
                  </Link>
                </li>
                <li>
                  <Link
                    to={R["/decks/$id/history"](deck.id)}
                    onClick={() => setOpen(false)}
                  >
                    <List />
                    List
                  </Link>
                </li>
              </ul>
            </Transition>
          )}
        />
      </div>
    </>
  );
}
