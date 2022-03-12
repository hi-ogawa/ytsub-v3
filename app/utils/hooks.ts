import * as React from "react";

export function useRafTime(): [number, () => void, () => void] {
  const rafId = React.useRef<number>();
  const base = React.useRef<number>();
  const [time, setTime] = React.useState(0);

  const loop = React.useCallback((rafTime: number) => {
    if (typeof base.current === "undefined") {
      base.current = rafTime;
    }
    setTime(rafTime - base.current);
    rafId.current = requestAnimationFrame(loop);
  }, []);

  React.useEffect(() => {
    return () => {
      if (typeof rafId.current !== "undefined") {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  function start() {
    end();
    rafId.current = requestAnimationFrame(loop);
  }

  function end() {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = undefined;
    }
    base.current = undefined;
    setTime(0);
  }

  return [time, start, end];
}
