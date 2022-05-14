import { Transition } from "@headlessui/react";
import { Link } from "@remix-run/react";
import { redirect } from "@remix-run/server-runtime";
import { range } from "lodash";
import * as React from "react";
import { BarChart2, List, MoreVertical } from "react-feather";
import { z } from "zod";
import { Popover } from "../../../components/popover";
import {
  PracticeHistoryChart,
  PracticeHistoryChartData,
} from "../../../components/practice-history-chart";
import { client } from "../../../db/client.server";
import { DeckTable, PracticeQueueType, Q } from "../../../db/models";
import { assert } from "../../../misc/assert";
import { R } from "../../../misc/routes";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { PageHandle } from "../../../utils/page-handle";
import { Timedelta } from "../../../utils/timedelta";
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

// TODO: adjust timezone by users
// - use geoip database (e.g. https://github.com/geoip-lite/node-geoip)
// - timezone in user setting (initialized via `Intl.DateTimeFormat().resolvedOptions().timeZone` on registration)
const TIMEZONE = "+09:00";

// TODO
// - page change weeks
// - group by PracticeActionType
// - different date range (e.g. month, year)
const REQUEST_SCHEMA = z.object({
  page: zStringToInteger.optional().default("1"), // 1 => this week, 2 => last week, ...
});

interface LoaderData {
  deck: DeckTable;
  page: number;
  data: PracticeHistoryChartData;
}

function formatYmd(date: Date, timezone: string): string {
  // date +%Y-%m-%d
  // => 2022-05-14
  assert(timezone.match(/^[+-]\d{2}:\d{2}$/));
  const tzsign = timezone[0] === "+" ? 1 : -1;
  const [tzh, tzm] = timezone.slice(1).split(":").map(Number);
  const tzoffset = tzsign * (tzh * 60 + tzm);
  const adjusted = Timedelta.make({ minutes: tzoffset }).radd(date);
  return adjusted.toISOString().slice(0, 10);
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);

  const parsed = REQUEST_SCHEMA.safeParse(this.query());
  if (!parsed.success) {
    this.flash({ content: "invalid parameters", variant: "error" });
    return redirect(R["/decks/$id/history-graph"](deck.id));
  }

  const { page } = parsed.data;
  const now = new Date();
  const begin = Timedelta.make({ days: -7 * page }).radd(now);
  const end = Timedelta.make({ days: -7 * (page - 1) }).radd(now);

  const rows: { queueType: PracticeQueueType; date: string; count: number }[] =
    await Q.practiceActions()
      .select("queueType", {
        date: client.raw(
          "DATE_FORMAT(CONVERT_TZ(createdAt, '+00:00', ?), '%Y-%m-%d')",
          TIMEZONE
        ), // Date
        count: client.raw("COUNT(0)"), // number
      })
      .where("deckId", deck.id)
      .where("createdAt", ">", begin)
      .where("createdAt", "<=", end)
      .groupBy("date", "queueType");

  const dates = range(7)
    .reverse()
    .map((i) => formatYmd(Timedelta.make({ days: i }).rsub(end), TIMEZONE));

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
  const { data }: LoaderData = useDeserialize(useLeafLoaderData());
  return (
    <div className="flex justify-center">
      <PracticeHistoryChart data={data} />
    </div>
  );
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
