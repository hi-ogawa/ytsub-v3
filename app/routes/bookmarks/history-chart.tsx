import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import React from "react";
import { SelectWrapper, transitionProps } from "../../components/misc";
import { PopoverSimple } from "../../components/popover";
import {
  EchartsComponent,
  createBookmarkHistoryChartOption,
} from "../../components/practice-history-chart";
import { ROUTE_DEF } from "../../misc/routes";
import { rpcClientQuery } from "../../trpc/client";
import { useClickOutside } from "../../utils/hooks-client-utils";
import {
  disableUrlQueryRevalidation,
  useUrlQuerySchema,
} from "../../utils/loader-utils";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { formatDateRange } from "../../utils/temporal-utils";
import { BookmarksMenuItems } from "./_ui";

export { loader } from "./history-chart.server";

export const shouldRevalidate = disableUrlQueryRevalidation;

//
// handle
//

export const handle: PageHandle = {
  navBarTitle: () => (
    <span>
      Bookmarks <span className="text-colorTextSecondary text-sm">(chart)</span>
    </span>
  ),
  navBarMenu: () => <NavBarMenuComponent />,
};

//
// component
//

export default function PageComponent() {
  const [params, setUrlQuery] = useUrlQuerySchema(
    ROUTE_DEF["/bookmarks/history-chart"].query
  );

  const historyChartQuery = useQuery({
    ...rpcClientQuery.bookmarks_historyChart.queryOptions(params),
    placeholderData: keepPreviousData,
  });

  const [instance, setInstance] = React.useState<echarts.ECharts>();

  // echarts doesn't close tooltip when clicked outside on mobile?
  const clickOutsideRef = useClickOutside(() => {
    instance?.dispatchAction({ type: "hideTip" });
  });

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col gap-3 mt-2">
        <div className="relative w-full h-[300px]" ref={clickOutsideRef}>
          {historyChartQuery.isSuccess && (
            <EchartsComponent
              className="w-full h-full"
              setInstance={setInstance}
              option={createBookmarkHistoryChartOption(historyChartQuery.data)}
              optionDeps={historyChartQuery.data}
            />
          )}
          <Transition
            show={historyChartQuery.isLoading}
            className="duration-500 antd-spin-overlay-20"
            {...transitionProps("opacity-0", "opacity-50")}
          />
        </div>
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 relative">
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
            {historyChartQuery.isRefetching && (
              <span className="absolute -right-5 antd-spin w-4 h-4" />
            )}
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
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBarMenuComponent() {
  return (
    <>
      <div className="flex items-center">
        <PopoverSimple
          placement="bottom-end"
          reference={
            <button className="antd-btn antd-btn-ghost i-ri-more-2-line w-6 h-6" />
          }
          floating={(context) => (
            <ul className="flex flex-col gap-2 p-2 w-[160px] text-sm">
              <BookmarksMenuItems
                onClickItem={() => context.onOpenChange(false)}
              />
            </ul>
          )}
        />
      </div>
    </>
  );
}
