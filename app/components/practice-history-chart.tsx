import { tinyassert } from "@hiogawa/utils";
import { useStableRef } from "@hiogawa/utils-react";
import { Temporal } from "@js-temporal/polyfill";
import { useQuery } from "@tanstack/react-query";
import type * as echarts from "echarts";
import React from "react";
import { PRACTICE_ACTION_TYPES, PRACTICE_QUEUE_TYPES } from "../db/types";
import { usePromiseQueryOpitons } from "../utils/misc";

export const PRACTICE_HISTORY_DATASET_KEYS = [
  "total",
  ...PRACTICE_QUEUE_TYPES.map((t) => `queue-${t}` as const),
  ...PRACTICE_ACTION_TYPES.map((t) => `action-${t}` as const),
] as const;

export type PracticeHistoryChartDataEntry = { date: string } & Record<
  (typeof PRACTICE_HISTORY_DATASET_KEYS)[number],
  number
>;

export function practiceHistoryChartDataToEchartsOption(
  datasetSource: PracticeHistoryChartDataEntry[],
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
          areaStyle: {
            color: `var(--antd-${COLOR_MAP[t]})`,
          },
          lineStyle: {
            color: `var(--antd-${COLOR_MAP[t]})`,
          },
          itemStyle: {
            color: `var(--antd-${COLOR_MAP[t]})`,
          },
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

const COLOR_MAP = {
  // queue
  NEW: "colorWarning",
  LEARN: "colorSuccess",
  REVIEW: "colorInfo",
  // action
  AGAIN: "colorError",
  HARD: "colorWarning",
  GOOD: "colorSuccess",
  EASY: "colorInfo",
};

// TODO: refactor with above
export function createBookmarkHistoryChartOption(
  datasetSource: {
    date: string;
    total: number;
  }[]
): echarts.EChartsOption {
  const today = Temporal.Now.zonedDateTimeISO().toPlainDate().toString();

  return {
    dataset: {
      dimensions: ["date", "total"],
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
      {
        type: "line",
        name: "total",
        areaStyle: {},
        emphasis: {
          disabled: true,
        },
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
  echarts: typeof echarts;
}) {
  const instanceRef = React.useRef<echarts.ECharts>();
  const setInstanceRef = useStableRef(props.setInstance);

  const elRef: React.RefCallback<HTMLElement> = (el) => {
    instanceRef.current?.dispose();
    // need svg for css variable based color
    instanceRef.current = el
      ? props.echarts.init(el, undefined, { renderer: "svg" })
      : undefined;
    setInstanceRef.current?.(instanceRef.current);
  };

  React.useEffect(() => {
    tinyassert(instanceRef.current);
    instanceRef.current.setOption(props.option);
  }, [props.optionDeps ?? props.option]);

  return <div className={props.className} ref={React.useCallback(elRef, [])} />;
}

// quick-and-dirty tree-shaking code-spliting for echarts
export function useEcharts() {
  return useQuery({
    ...usePromiseQueryOpitons(() =>
      !import.meta.env.SSR ? import("echarts") : undefined!
    ),
  });
}
