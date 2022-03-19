import * as React from "react";
import { Transition } from "react-transition-group";

// based on https://github.com/mui/material-ui/blob/bbdf5080fc9bd9d979d657a3cb237d88b27035d9/packages/mui-material/src/Collapse/Collapse.js
export function Collapse({
  children,
  show,
  appear = false,
  duration = 1000,
  afterLeave,
}: React.PropsWithChildren<{
  show: boolean;
  appear?: boolean;
  duration?: number;
  afterLeave?: () => void;
}>) {
  const outer = React.useRef<HTMLElement>();
  const inner = React.useRef<HTMLElement>();
  return (
    <Transition
      in={show}
      appear={appear}
      timeout={duration}
      onEnter={() => collapseSize(outer.current!)}
      onEntering={() => copySize(outer.current!, inner.current!)}
      onEntered={() => copySize(outer.current!, inner.current!)}
      onExit={() => {
        copySize(outer.current!, inner.current!);
        inner.current!.clientHeight; // force layout for collapsing first time when `appear: true`
      }}
      onExiting={() => collapseSize(outer.current!)}
      onExited={afterLeave}
    >
      <div
        ref={outer as any}
        className="w-full overflow-hidden transition-[height]"
        style={{ transitionDuration: `${duration}ms` }}
      >
        <div ref={inner as any} className="w-full flex">
          <div className="w-full">{children}</div>
        </div>
      </div>
    </Transition>
  );
}

function copySize(outer: HTMLElement, inner: HTMLElement) {
  outer.style.height = inner.clientHeight + "px";
}

function collapseSize(outer: HTMLElement) {
  outer.style.height = "0px";
}
