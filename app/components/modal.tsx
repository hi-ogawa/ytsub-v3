import {
  FloatingPortal,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
} from "@floating-ui/react";
import { Transition } from "@headlessui/react";
import { tinyassert } from "@hiogawa/utils";
import { useStableRef } from "@hiogawa/utils-react";
import React from "react";
import { RemoveScroll } from "react-remove-scroll";
import { cls } from "../utils/misc";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/02adfc9dfcb7cebbc31cd4651395e1ecc67d813e/packages/app/src/components/modal.tsx

export function Modal(props: {
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
          entered="opacity-40"
          leaveFrom="opacity-40"
          leaveTo="opacity-0"
        />
        {/* content */}
        <RemoveScroll className="fixed inset-0 overflow-hidden flex justify-center items-center">
          <Transition.Child
            className={cls(
              props.className,
              "transition duration-300 transform w-[90%] max-w-xl shadow-lg"
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
              data-test="modal"
            >
              {props.children}
            </div>
          </Transition.Child>
        </RemoveScroll>
      </Transition>
    </FloatingPortal>
  );
}

export function useModal() {
  const [open, setOpen] = React.useState(false);
  const openRef = useStableRef(open); // pass stable ref to Wrapper

  const [Wrapper] = React.useState(
    () =>
      function Wrapper(props: {
        className?: string;
        children: React.ReactNode;
      }) {
        return (
          <Modal
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
