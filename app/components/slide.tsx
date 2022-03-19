import * as React from "react";
import { Transition } from "react-transition-group";

export function Slide({
  children,
  show,
  appear = false,
  duration = 1000,
  outside = "translateX(-150%)",
  inside = "translateX(0)",
  afterLeave,
}: React.PropsWithChildren<{
  show: boolean;
  appear?: boolean;
  duration?: number;
  outside?: string;
  inside?: string;
  afterLeave?: () => void;
}>) {
  const outer = React.useRef<HTMLElement>();
  return (
    <Transition
      in={show}
      appear={appear}
      timeout={duration}
      onEnter={() => (outer.current!.style.transform = outside)}
      onEntering={() => {
        outer.current!.clientWidth; // Force layout on `appear = true`
        outer.current!.style.transform = inside;
      }}
      onExit={() => (outer.current!.style.transform = inside)}
      onExiting={() => (outer.current!.style.transform = outside)}
      onExited={afterLeave}
    >
      <div
        ref={outer as any}
        className="w-full transition-transform"
        style={{ transitionDuration: `${duration}ms` }}
      >
        {children}
      </div>
    </Transition>
  );
}
