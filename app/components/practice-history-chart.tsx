import { tinyassert } from "@hiogawa/utils";
import { useStableRef } from "@hiogawa/utils-react";
import * as echarts from "echarts";
import React from "react";
import type { PracticeQueueType } from "../db/types";

type PracticeHistoryChartDataEntry = {
  date: string;
  total: number;
} & Record<PracticeQueueType, number>;

export type PracticeHistoryChartData = PracticeHistoryChartDataEntry[];

export function PracticeHistoryChart(
  props: {
    data: PracticeHistoryChartData;
  } & Omit<React.ComponentProps<typeof EchartsComponent>, "option">
) {
  const { data, ...rest } = props;
  const option = React.useMemo(
    () => practiceHistoryChartDataToEchartsOption(data),
    [data]
  );
  return <EchartsComponent option={option} {...rest} />;
}

function practiceHistoryChartDataToEchartsOption(
  data: PracticeHistoryChartData
) {
  return {
    ...BASE_ECHARTS_OPTION,
    dataset: {
      dimensions: ["date", "total", "NEW", "LEARN", "REVIEW"],
      source: data,
    },
  };
}

const BASE_ECHARTS_OPTION: echarts.EChartsOption = {
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
  dataset: {},
  xAxis: {
    type: "category",
    boundaryGap: false,
    axisLabel: {
      formatter: (value, _index) => {
        // 2022-05-14 => 05/14
        const [, m, d] = value.split("-");
        return m + "/" + d;
      },
    },
  },
  yAxis: {
    type: "value",
    minInterval: 1,
  },
  series: [
    // colors are obtained by reordering default theme colors in
    // https://github.com/apache/echarts/blob/1fb0d6f1c2d5a6084198bbc2a1b928df66abbaab/src/model/globalDefault.ts#L37-L47
    {
      type: "line",
      stack: "total",
      name: "new",
      areaStyle: {
        color: "#5470c6",
      },
      lineStyle: {
        color: "#5470c6",
      },
      itemStyle: {
        color: "#5470c6",
      },
      emphasis: {
        disabled: true,
      },
      encode: {
        x: "date",
        y: "NEW",
      },
    },
    {
      type: "line",
      stack: "total",
      name: "learn",
      areaStyle: {
        color: "#ee6666",
      },
      lineStyle: {
        color: "#ee6666",
      },
      itemStyle: {
        color: "#ee6666",
      },
      emphasis: {
        disabled: true,
      },
      encode: {
        x: "date",
        y: "LEARN",
      },
    },
    {
      type: "line",
      stack: "total",
      name: "review",
      areaStyle: {
        color: "#91cc75",
      },
      lineStyle: {
        color: "#91cc75",
      },
      itemStyle: {
        color: "#91cc75",
      },
      emphasis: {
        disabled: true,
      },
      encode: {
        x: "date",
        y: "REVIEW",
      },
    },
    {
      type: "line",
      name: "total",
      symbol: "none",
      cursor: "none",
      itemStyle: {
        color: "#fac858",
      },
      lineStyle: {
        color: "#fac858",
        opacity: 0,
      },
      encode: {
        x: "date",
        y: "total",
      },
    },
  ],
};

//
// utils
//

function EchartsComponent(props: {
  option: echarts.EChartsOption;
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
  }, [props.option]);

  return <div className={props.className} ref={React.useCallback(elRef, [])} />;
}
