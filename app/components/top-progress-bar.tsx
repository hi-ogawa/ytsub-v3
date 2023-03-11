import { Transition } from "@headlessui/react";
import React from "react";
import { usePrevious } from "react-use";
import { useRafTime } from "../utils/hooks";

const FINISH_DURATION = 500;

export function TopProgressBar({ loading }: { loading: boolean }) {
  const prev = usePrevious(loading);
  const [showing, setShowing] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const [time, startTime, endTime] = useRafTime();

  React.useEffect(() => {
    let clear: any;
    if (!loading) {
      if (showing) {
        setFinishing(true);
        const timer = setTimeout(() => setShowing(false), FINISH_DURATION);
        clear = () => clearTimeout(timer);
      }
      endTime();
    }
    if (loading && !prev) {
      setFinishing(false);
      setShowing(true);
      startTime();
    }
    return clear;
  }, [loading]);

  return (
    <Transition
      as={React.Fragment}
      show={showing}
      leave="transition-opacity duration-250"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className={`absolute top-0 z-50 w-full`}>
        <div className="absolute border-b-[3px] w-full border-secondary/[.3]" />
        <div
          className="absolute border-b-[3px] w-full shadow-sm border-secondary"
          style={{
            transformOrigin: "0 0",
            transform: finishing
              ? "scaleX(1)"
              : `scaleX(${computeProgress(time / 1000)})`,
            transitionProperty: finishing ? "transform" : "none",
            transitionDuration: finishing ? String(FINISH_DURATION) : "0",
          }}
        />
      </div>
    </Transition>
  );
}

function computeProgress(s: number): number {
  // C1 function [0, oo) -> [0, 1)

  // linear: [0, 1] -> [0, 0.5]
  if (s < 1) {
    return 0.5 * s;
  }

  // tanh: [1, oo) -> [0.5, 1)
  return 0.5 + 0.5 * Math.tanh(s - 1);
}
