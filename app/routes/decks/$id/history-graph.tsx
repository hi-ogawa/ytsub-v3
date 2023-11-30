import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { useQuery } from "@tanstack/react-query";
import type { ECharts } from "echarts";
import React from "react";
import { SelectWrapper, transitionProps } from "../../../components/misc";
import {
  EchartsComponent,
  practiceHistoryChartDataToEchartsOption,
  useEcharts,
} from "../../../components/practice-history-chart";
import { ROUTE_DEF } from "../../../misc/routes";
import { rpcClientQuery } from "../../../trpc/client";
import { useClickOutside } from "../../../utils/hooks-client-utils";
import {
  disableUrlQueryRevalidation,
  useLeafLoaderData,
  useLoaderDataExtra,
  useUrlQuerySchema,
} from "../../../utils/loader-utils";
import { cls } from "../../../utils/misc";
import type { PageHandle } from "../../../utils/page-handle";
import { formatDateRange } from "../../../utils/temporal-utils";
import { DeckNavBarMenuComponent } from "./_ui";
import type { LoaderData } from "./_utils.server";
export { loader } from "./_utils.server";

export const shouldRevalidate = disableUrlQueryRevalidation;

export const handle: PageHandle = {
  navBarTitle: () => <NavBarTitleComponent />,
  navBarMenu: () => <DeckNavBarMenuComponent />,
};

//
// DefaultComponent
//

export default function DefaultComponent() {
  const { deck } = useLoaderDataExtra() as LoaderData;

  const [instance, setInstance] = React.useState<ECharts>();

  const clickOutsideRef = useClickOutside(() => {
    instance?.dispatchAction({ type: "hideTip" });
  });

  const [params, setUrlQuery] = useUrlQuerySchema(
    ROUTE_DEF["/decks/$id/history-graph"].query
  );

  const historyChartQuery = useQuery({
    ...rpcClientQuery.decks_practiceHistoryChart.queryOptions({
      deckId: deck.id,
      rangeType: params.rangeType,
      page: params.page,
    }),
    keepPreviousData: true,
  });

  const echartsQuery = useEcharts();

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col gap-3 mt-2">
        <div className="relative w-full h-[300px]" ref={clickOutsideRef}>
          {historyChartQuery.isSuccess && echartsQuery.isSuccess && (
            <EchartsComponent
              className="w-full h-full"
              setInstance={setInstance}
              option={practiceHistoryChartDataToEchartsOption(
                historyChartQuery.data,
                params.graphType
              )}
              optionDeps={historyChartQuery.data}
              echarts={echartsQuery.data}
              // workaround tooltip bugs when switching series
              key={params.graphType}
            />
          )}
          <Transition
            show={historyChartQuery.isFetching && !echartsQuery.isSuccess}
            className="duration-500 antd-spin-overlay-20"
            {...transitionProps("opacity-0", "opacity-50")}
          />
        </div>
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <button
              className="antd-btn antd-btn-ghost i-ri-play-mini-fill w-4 h-4 rotate-[180deg]"
              onClick={() => setUrlQuery({ page: params.page + 1 })}
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
              onClick={() => setUrlQuery({ page: params.page - 1 })}
            />
          </div>
          <div className="flex justify-center items-center gap-2">
            <SelectWrapper
              data-testid="SelectWrapper-rangeType"
              className="antd-input p-1"
              options={["week", "month"] as const}
              labelFn={(value) => `by ${value}`}
              value={params.rangeType}
              onChange={(rangeType) =>
                setUrlQuery({ rangeType, page: undefined })
              }
            />
            <SelectWrapper
              data-testid="SelectWrapper-graphType"
              className="antd-input p-1"
              options={["action", "queue"] as const}
              labelFn={(value) => `by ${value}`}
              value={params.graphType}
              onChange={(graphType) => setUrlQuery({ graphType })}
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
  const { deck } = useLeafLoaderData() as LoaderData;
  return (
    <span>
      {deck.name}{" "}
      <span className="text-colorTextSecondary text-sm">(chart)</span>
    </span>
  );
}
