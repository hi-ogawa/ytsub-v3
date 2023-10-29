import {
  FloatingOverlay,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { createTinyStore } from "@hiogawa/tiny-store";
import { useTinyStore } from "@hiogawa/tiny-store/dist/react";
import { Transition } from "@hiogawa/tiny-transition/dist/react";
import { tinyassert } from "@hiogawa/utils";
import React from "react";
import { cls } from "../utils/misc";
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
      <Transition
        className="transition duration-300fixed inset-0"
        show={props.open}
      >
        {/* backdrop */}
        <Transition
          appear
          show={props.open}
          className="transition duration-300 fixed inset-0 bg-black"
          enterFrom="opacity-0"
          enterTo="opacity-40"
          entered="opacity-40"
          leaveFrom="opacity-40"
          leaveTo="opacity-0"
        />
        {/* content */}
        <FloatingOverlay
          className="flex justify-center items-center !overflow-hidden"
          lockScroll
        >
          <Transition
            appear
            show={props.open}
            className={cls(
              props.className,
              "transition duration-300 transform w-[90%] max-w-xl antd-floating max-h-[90%] overflow-y-auto"
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
          </Transition>
        </FloatingOverlay>
      </Transition>
    </FloatingWrapper>
  );
}

// it feels like a huge hack but it works so conveniently
export function useModal(defaultOpen?: boolean) {
  // create store on the fly to communicate with Wrapper component
  const [openStore] = React.useState(() =>
    createTinyStore(defaultOpen ?? false)
  );
  const [open, setOpen] = useTinyStore(openStore);

  // define Wrapper component on the fly
  const [Wrapper] = React.useState(
    () =>
      function Wrapper(props: {
        className?: string;
        children: React.ReactNode;
      }) {
        const [open, setOpen] = useTinyStore(openStore);
        return <Modal open={open} onClose={() => setOpen(false)} {...props} />;
      }
  );

  return {
    open,
    setOpen,
    Wrapper,
  };
}
