import { useDismiss, useFloating, useInteractions } from "@floating-ui/react";
import { Transition } from "@headlessui/react";
import { tinyassert } from "@hiogawa/utils";
import React from "react";
import { RemoveScroll } from "react-remove-scroll";
import { cls } from "../utils/misc";
import { SimpleStore, useSimpleStore } from "../utils/simple-store";
import { FloatingWrapper } from "./floating-utils";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/02adfc9dfcb7cebbc31cd4651395e1ecc67d813e/packages/app/src/components/modal.tsx

function Modal(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // override modal content container style e.g. max width/height
}) {
  const { refs, context } = useFloating({
    open: props.open,
    onOpenChange: (open) => {
      tinyassert(!open); // should get only `open = false` via `useDismiss`
      props.onClose();
    },
  });
  const { getFloatingProps } = useInteractions([useDismiss(context)]);

  return (
    <FloatingWrapper>
      <Transition className="fixed inset-0" appear show={props.open}>
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
              "transition duration-300 transform w-[90%] max-w-xl antd-floating"
            )}
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div
              {...getFloatingProps({
                ref: refs.setFloating,
                className: "w-full",
              })}
              data-test="modal"
            >
              {props.children}
            </div>
          </Transition.Child>
        </RemoveScroll>
      </Transition>
    </FloatingWrapper>
  );
}

// it feels like a huge hack but it works so conveniently
export function useModal(defaultOpen?: boolean) {
  // create store on the fly to communicate with Wrapper component
  const [openStore] = React.useState(
    () => new SimpleStore(defaultOpen ?? false)
  );
  const [open, setOpen] = useSimpleStore(openStore);

  // define Wrapper component on the fly
  const [Wrapper] = React.useState(
    () =>
      function Wrapper(props: {
        className?: string;
        children: React.ReactNode;
      }) {
        const [open, setOpen] = useSimpleStore(openStore);
        return <Modal open={open} onClose={() => setOpen(false)} {...props} />;
      }
  );

  return {
    open,
    setOpen,
    Wrapper,
  };
}
