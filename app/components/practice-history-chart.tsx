import * as echarts from "echarts";
import * as React from "react";
import { PracticeQueueType } from "../db/models";
import { assert } from "../misc/assert";

function EchartsComponent(props: {
  option: echarts.EChartsOption;
  className?: string;
}) {
  const ref = React.useRef(null);
  const instance = React.useRef<echarts.ECharts>();

  React.useEffect(() => {
    if (!instance.current) {
      assert(ref.current);
      instance.current = echarts.init(ref.current);
    }
    instance.current.setOption(props.option);
  }, [props.option]);

  return <div ref={ref} className={props.className} />;
}

const BASE_ECHARTS_OPTION: echarts.EChartsOption = {
  animation: false,
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "cross",
      label: {
        backgroundColor: "#6a7985",
      },
    },
    order: "seriesDesc",
  },
  grid: {
    left: "3%",
    right: "4%",
    bottom: "3%",
    containLabel: true,
  },
  dataset: {
    dimensions: ["date", "total", "NEW", "LEARN", "REVIEW"],
    source: [
      { date: "5/8", total: 10, NEW: 3, LEARN: 4, REVIEW: 3 },
      { date: "5/9", total: 9, NEW: 2, LEARN: 5, REVIEW: 2 },
      { date: "5/10", total: 16, NEW: 7, LEARN: 6, REVIEW: 3 },
      { date: "5/11", total: 18, NEW: 5, LEARN: 8, REVIEW: 5 },
      { date: "5/12", total: 18, NEW: 8, LEARN: 7, REVIEW: 3 },
      { date: "5/13", total: 14, NEW: 2, LEARN: 5, REVIEW: 7 },
      { date: "5/14", total: 18, NEW: 5, LEARN: 8, REVIEW: 5 },
    ],
  },
  xAxis: {
    type: "category",
    boundaryGap: false,
  },
  yAxis: {
    type: "value",
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
        focus: "series",
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
        focus: "series",
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
        focus: "series",
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

type PracticeHistoryChartDataEntry = {
  date: string;
  total: number;
} & Record<PracticeQueueType, number>;

export function PracticeHistoryChart({
  data,
}: {
  data: PracticeHistoryChartDataEntry[];
}) {
  const option = React.useMemo(() => {
    return {
      ...BASE_ECHARTS_OPTION,
      dataset: {
        dimensions: ["date", "total", "NEW", "LEARN", "REVIEW"],
        source: data,
      },
    };
  }, [data]);
  return <EchartsComponent option={option} className="w-[400px] h-[300px]" />;
}
