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

  function toggle(visible: boolean) {
    if (visible) {
      outer.current!.style.height = inner.current!.clientHeight + "px";
    } else {
      outer.current!.style.height = "0px";
    }
    inner.current!.clientHeight; // force layout for collapsing first time when `appear: true`
  }

  return (
    <Transition
      in={show}
      appear={appear}
      timeout={duration}
      onEnter={() => toggle(false)}
      onEntering={() => toggle(true)}
      onExit={() => toggle(true)}
      onExiting={() => toggle(false)}
      onExited={afterLeave}
    >
      {(state) => (
        <div
          ref={outer as any}
          // "overflow-hidden" needs to be disabled when `entered` for slide/collapse animation to support shadow
          className={`
            w-full transition-[height]
            ${state !== "entered" && "overflow-hidden"}
          `}
          style={{ transitionDuration: `${duration}ms` }}
        >
          <div ref={inner as any} className="w-full flex">
            <div className="w-full">{children}</div>
          </div>
        </div>
      )}
    </Transition>
  );
}
