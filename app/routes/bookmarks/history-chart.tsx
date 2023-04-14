import { Transition } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { transitionProps } from "../../components/misc";
import {
  EchartsComponent,
  createBookmarkHistoryChartOption,
} from "../../components/practice-history-chart";
import { trpc } from "../../trpc/client";
import { Controller, makeLoader } from "../../utils/controller-utils";
import { cls } from "../../utils/misc";
import { SelectWrapper, formatPage } from "../decks/$id/history-graph";

//
// loader
//

export const loader = makeLoader(Controller, async function () {
  await this.requireUser();
  return null;
});

//
// component
//

export default function PageComponent() {
  const form = useForm<{
    rangeType: "week" | "month";
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

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-lg flex flex-col gap-3 mt-2">
        <div className="relative w-full h-[300px]">
          {historyChartQuery.isSuccess && (
            <EchartsComponent
              className="w-full h-full"
              option={createBookmarkHistoryChartOption(historyChartQuery.data)}
              optionDeps={historyChartQuery.data}
            />
          )}
          <Transition
            show={historyChartQuery.isLoading}
            className="duration-500 antd-body antd-spin-overlay-20"
            {...transitionProps("opacity-0", "opacity-100")}
          />
        </div>
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <button
              className="antd-btn antd-btn-ghost i-ri-play-mini-fill w-4 h-4 rotate-[180deg]"
              onClick={() => form.setValue("page", params.page + 1)}
            />
            <div className="text-sm px-2">{formatPage(params)}</div>
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
