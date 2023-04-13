import { tinyassert } from "@hiogawa/utils";
import { useStableRef } from "@hiogawa/utils-react";
import { Temporal } from "@js-temporal/polyfill";
import * as echarts from "echarts";
import React from "react";
import { PRACTICE_ACTION_TYPES, PRACTICE_QUEUE_TYPES } from "../db/types";

export const PRACTICE_HISTORY_DATASET_KEYS = [
  "total",
  ...PRACTICE_QUEUE_TYPES.map((t) => `queue-${t}` as const),
  ...PRACTICE_ACTION_TYPES.map((t) => `action-${t}` as const),
] as const;

export type PracticeHistoryChartDatasetKeys =
  (typeof PRACTICE_HISTORY_DATASET_KEYS)[number];

export type PracticeHistoryChartDataEntry = {
  date: string;
} & Record<PracticeHistoryChartDatasetKeys, number>;

export function practiceHistoryChartDataToEchartsOption(
  datasetSource: Partial<PracticeHistoryChartDataEntry>[],
  mode: "queue" | "action"
): echarts.EChartsOption {
  const today = Temporal.Now.zonedDateTimeISO().toPlainDate().toString();

  return {
    dataset: {
      dimensions: ["date", ...PRACTICE_HISTORY_DATASET_KEYS],
      source: datasetSource,
    },
    animation: false,
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "line",
        label: {
          backgroundColor: "#6a7985",
        },
      },
      order: "seriesDesc",
    },
    grid: {
      left: "8%",
      right: "6%",
      bottom: "8%",
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      axisLabel: {
        formatter: (value, _index) => {
          // 2022-05-14 => 05/14
          const [, m, d] = value.split("-");
          let result = m + "/" + d;
          if (value === today) {
            // emphasize label for "today"
            result = `[${result}]`;
          }
          return result;
        },
      },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
    },
    series: [
      ...(mode === "queue" ? PRACTICE_QUEUE_TYPES : PRACTICE_ACTION_TYPES).map(
        (t): echarts.LineSeriesOption => ({
          type: "line",
          stack: "total",
          name: t.toLowerCase(),
          areaStyle: {},
          emphasis: {
            disabled: true,
          },
          encode: {
            x: "date",
            y: `${mode}-${t}`,
          },
        })
      ),
      // show "total" only in tooltip
      {
        type: "line",
        name: "total",
        symbol: "none",
        cursor: "none",
        color: "#ccc",
        lineStyle: { opacity: 0 },
        encode: {
          x: "date",
          y: "total",
        },
      },
    ],
  };
}

//
// utils
//

export function EchartsComponent(props: {
  option: echarts.EChartsOption;
  optionDeps?: unknown; // convenience for simpler render/option invalidation
  className?: string;
  setInstance?: (instance?: echarts.ECharts) => void;
}) {
  const instanceRef = React.useRef<echarts.ECharts>();
  const setInstanceRef = useStableRef(props.setInstance);

  const elRef: React.RefCallback<HTMLElement> = (el) => {
    instanceRef.current?.dispose();
    instanceRef.current = el ? echarts.init(el) : undefined;
    setInstanceRef.current?.(instanceRef.current);
  };

  React.useEffect(() => {
    tinyassert(instanceRef.current);
    instanceRef.current.setOption(props.option);
  }, [props.optionDeps ?? props.option]);

  return <div className={props.className} ref={React.useCallback(elRef, [])} />;
}
