import { DeckNavBarMenuComponent, requireUserAndDeck } from ".";
import { Transition } from "@headlessui/react";
import { useMatches, useNavigate } from "@remix-run/react";
import { useQuery } from "@tanstack/react-query";
import type { ECharts } from "echarts";
import React from "react";
import { useForm } from "react-hook-form";
import { SelectWrapper, transitionProps } from "../../../components/misc";
import {
  EchartsComponent,
  practiceHistoryChartDataToEchartsOption,
} from "../../../components/practice-history-chart";
import type { DeckTable } from "../../../db/models";
import { $R } from "../../../misc/routes";
import { trpc } from "../../../trpc/client";
import { Controller, makeLoader } from "../../../utils/controller-utils";
import { useDeserialize } from "../../../utils/hooks";
import { useClickOutside } from "../../../utils/hooks-client-utils";
import { useLeafLoaderData } from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import { formatDateRange } from "../../../utils/temporal-utils";

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
}

export const loader = makeLoader(Controller, async function () {
  const [, deck] = await requireUserAndDeck.apply(this);
  const loaderData: LoaderData = { deck };
  return this.serialize(loaderData);
});

//
// DefaultComponent
//

export default function DefaultComponent() {
  const { deck }: LoaderData = useDeserialize(useLeafLoaderData());

  const [instance, setInstance] = React.useState<ECharts>();

  const clickOutsideRef = useClickOutside(() => {
    instance?.dispatchAction({ type: "hideTip" });
  });

  const form = useForm<{
    rangeType: "week" | "month";
    graphType: "action" | "queue";
    page: number;
  }>({
    defaultValues: {
      rangeType: "week",
      graphType: "action",
      page: 0,
    },
  });
  const params = form.watch();

  const historyChartQuery = useQuery({
    ...trpc.decks_practiceHistoryChart.queryOptions({
      deckId: deck.id,
      rangeType: params.rangeType,
      page: params.page,
    }),
    keepPreviousData: true,
  });

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col gap-3 mt-2">
        <div className="relative w-full h-[300px]" ref={clickOutsideRef}>
          {historyChartQuery.isSuccess && (
            <EchartsComponent
              className="w-full h-full"
              setInstance={setInstance}
              option={practiceHistoryChartDataToEchartsOption(
                historyChartQuery.data,
                params.graphType
              )}
              optionDeps={historyChartQuery.data}
              // TODO: workaround tooltip bugs when switching series
              key={params.graphType}
            />
          )}
          <Transition
            show={historyChartQuery.isFetching}
            className="duration-500 antd-body antd-spin-overlay-20"
            {...transitionProps("opacity-0", "opacity-50")}
          />
        </div>
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <button
              className="antd-btn antd-btn-ghost i-ri-play-mini-fill w-4 h-4 rotate-[180deg]"
              onClick={() => form.setValue("page", params.page + 1)}
            />
            <div className="text-sm px-2">
              {formatDateRange(params.rangeType, params.page)}
            </div>
            <button
              className={cls(
                "antd-btn antd-btn-ghost i-ri-play-mini-fill w-4 h-4",
                params.page === 0 &&
                  "text-colorTextDisabled pointer-events-none"
              )}
              onClick={() => form.setValue("page", params.page - 1)}
            />
          </div>
          <div className="flex justify-center items-center gap-2">
            <SelectWrapper
              data-testid="SelectWrapper-rangeType"
              className="antd-input p-1"
              options={["week", "month"] as const}
              labelFn={(value) => `by ${value}`}
              value={params.rangeType}
              onChange={(rangeType) => {
                form.setValue("rangeType", rangeType);
                form.setValue("page", 0);
              }}
            />
            <SelectWrapper
              data-testid="SelectWrapper-graphType"
              className="antd-input p-1"
              options={["action", "queue"] as const}
              labelFn={(value) => `by ${value}`}
              value={params.graphType}
              onChange={(graphType) => form.setValue("graphType", graphType)}
            />
          </div>
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
