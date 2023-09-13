import { Transition } from "@hiogawa/tiny-transition/dist/react";
import React from "react";

export function CollapseTransition(
  props: React.ComponentProps<typeof Transition>
) {
  return <Transition {...props} {...getCollapseProps()} />;
}

function getCollapseProps(): Partial<React.ComponentProps<typeof Transition>> {
  function uncollapse(el: HTMLElement) {
    if (el.firstElementChild) {
      el.style.height = el.firstElementChild.clientHeight + "px";
    }
  }

  function collapse(el: HTMLElement) {
    el.style.height = "0px";
  }

  return {
    onEnterFrom: collapse,
    onEnterTo: uncollapse,
    // slight hack for SnackbarAnimation1
    // without this collapse parent cannot see children's height
    onEntered: (el) =>
      window.requestAnimationFrame(() => {
        uncollapse(el);
      }),
    onLeaveFrom: uncollapse,
    onLeaveTo: collapse,
  };
}
