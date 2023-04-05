import { Transition } from "@headlessui/react";
import { tinyassert } from "@hiogawa/utils";
import React from "react";

// copied from https://github.com/hi-ogawa/unocss-preset-antd/blob/28629d2eca2537bfb847253351ed79640d5252aa/packages/app/src/components/collapse.tsx#L5-L11
// TODO: make @hiogawa/utils-react-ui or @hiogawa/unocss-preset-antd-react package?

export function CollapseTransition(
  props: React.ComponentProps<typeof Transition> & object
) {
  const collpaseProps = useCollapseProps();
  return <Transition {...props} {...collpaseProps} />;
}

function useCollapseProps(): Partial<React.ComponentProps<typeof Transition>> {
  const refEl = React.useRef<HTMLDivElement>();

  const refCallback: React.RefCallback<HTMLDivElement> = (el) => {
    if (el) {
      uncollapse(el);
    }
    refEl.current = el ?? undefined;
  };

  function uncollapse(el: HTMLDivElement) {
    const child = el.firstElementChild;
    tinyassert(child);
    el.style.height = child.clientHeight + "px";
  }

  function collapse(el: HTMLDivElement) {
    el.style.height = "0px";
  }

  function beforeEnter() {
    const el = refEl.current;
    tinyassert(el);
    uncollapse(el);
  }

  function beforeLeave() {
    const el = refEl.current;
    tinyassert(el);
    collapse(el);
  }

  return { ref: React.useCallback(refCallback, []), beforeEnter, beforeLeave };
}
