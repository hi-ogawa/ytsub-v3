import {
  FloatingPortal,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
} from "@floating-ui/react-dom-interactions";
import { Transition } from "@headlessui/react";
import { tinyassert } from "@hiogawa/utils";
import { useStableRef } from "@hiogawa/utils-react";
import React from "react";
import { RemoveScroll } from "react-remove-scroll";
import { cls } from "../utils/misc";

// copied from https://github.com/hi-ogawa/web-ext-tab-manager/blame/81710dead04859525b9c8be3a73a71926cae6da4/src/components/modal.tsx

export function ModalV2(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // override modal content container style e.g. max width/height
}) {
  const { floating, context } = useFloating({
    open: props.open,
    onOpenChange: (open) => {
      tinyassert(!open); // should get only `open = false` via `useDismiss`
      props.onClose();
    },
  });
  const { getFloatingProps } = useInteractions([useDismiss(context)]);
  const id = useId();

  return (
    <FloatingPortal id={id}>
      <Transition appear show={props.open} className="z-100">
        {/* backdrop */}
        <Transition.Child
          className="transition duration-300 fixed inset-0 bg-black"
          enterFrom="opacity-0"
          enterTo="opacity-40"
          leaveFrom="opacity-40"
          leaveTo="opacity-0"
        />
        {/* content */}
        <RemoveScroll className="fixed inset-0 overflow-hidden flex justify-center items-center">
          <Transition.Child
            className={cls(
              props.className,
              "transition duration-300 transform w-[90%] max-w-[700px] h-[90%] max-h-[500px] bg-colorBgContainer shadow-lg"
            )}
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div
              {...getFloatingProps({
                ref: floating,
                className: "w-full h-full",
              })}
            >
              {props.children}
            </div>
          </Transition.Child>
        </RemoveScroll>
      </Transition>
    </FloatingPortal>
  );
}

export function useModalV2() {
  const [open, setOpen] = React.useState(false);
  const openRef = useStableRef(open); // pass stable ref to Wrapper

  const [Wrapper] = React.useState(
    () =>
      function Wrapper(props: {
        className?: string;
        children: React.ReactNode;
      }) {
        return (
          <ModalV2
            open={openRef.current}
            onClose={() => setOpen(false)}
            {...props}
          />
        );
      }
  );

  return {
    open,
    setOpen,
    Wrapper,
  };
}
