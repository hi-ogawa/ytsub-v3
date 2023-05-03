import { Transition } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useForm } from "react-hook-form";
import { SelectWrapper, transitionProps } from "../../components/misc";
import { PopoverSimple } from "../../components/popover";
import {
  EchartsComponent,
  createBookmarkHistoryChartOption,
} from "../../components/practice-history-chart";
import { trpc } from "../../trpc/client";
import { useClickOutside } from "../../utils/hooks-client-utils";
import { makeLoader } from "../../utils/loader-utils.server";
import { cls } from "../../utils/misc";
import type { PageHandle } from "../../utils/page-handle";
import { DateRangeType, formatDateRange } from "../../utils/temporal-utils";
import { BookmarksMenuItems } from "./index";

//
// loader
//

export const loader = makeLoader(async ({ ctx }) => {
  await ctx.requireUser();
  return null;
});

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
  // TODO: use url query
  const form = useForm<{
    rangeType: DateRangeType;
    page: number;
  }>({
    defaultValues: {
      rangeType: "week",
      page: 0,
    },
  });
  const params = form.watch();

  const historyChartQuery = useQuery({
    ...trpc.bookmarks_historyChart.queryOptions(params),
    keepPreviousData: true,
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
