import * as React from "react";
import { Transition } from "react-transition-group";

export function Slide({
  children,
  show,
  appear = false,
  duration = 1000,
  transformIn = "translateX(0)",
  transformOut = "translateX(-150%)",
  afterLeave,
}: React.PropsWithChildren<{
  show: boolean;
  appear?: boolean;
  duration?: number;
  transformIn?: string;
  transformOut?: string;
  afterLeave?: () => void;
}>) {
  const outer = React.useRef<HTMLElement>();

  function toggle(visible: boolean) {
    outer.current!.style.transform = visible ? transformIn : transformOut;
    outer.current!.clientWidth; // Force layout on `appear = true`;
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
