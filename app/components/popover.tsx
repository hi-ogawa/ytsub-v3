import {
  FloatingContext,
  FloatingPortal,
  Placement,
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
} from "@floating-ui/react";
import { Transition } from "@headlessui/react";
import React from "react";
import { cls } from "../utils/misc";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/95b2359ca2a7bcec3ccc36762fae4929937b628e/packages/app/src/components/popover.tsx

interface PopoverRenderProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  props: {};
  arrowProps?: {};
  context: FloatingContext;
}

export function Popover(props: {
  placement: Placement;
  reference: (renderProps: PopoverRenderProps) => React.ReactNode;
  floating: (renderProps: PopoverRenderProps) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const arrowRef = React.useRef<Element>(null);

  const { reference, floating, context, x, y, strategy, middlewareData } =
    useFloating({
      open,
      onOpenChange: setOpen,
      placement: props.placement,
      middleware: [
        offset(17),
        flip(),
        shift(),
        arrow({ element: arrowRef, padding: 10 }),
      ],
      whileElementsMounted: autoUpdate,
    });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
  ]);

  const id = useId();

  return (
    <>
      {props.reference({
        context,
        open,
        setOpen,
        props: getReferenceProps({
          ref: reference,
        }),
      })}
      <FloatingPortal id={id}>
        {props.floating({
          context,
          open,
          setOpen,
          props: getFloatingProps({
            ref: floating,
            style: {
              top: y ?? "",
              left: x ?? "",
              position: strategy,
            },
          }),
          arrowProps: {
            ref: arrowRef,
            style: {
              top: middlewareData.arrow?.y ?? "",
              left: middlewareData.arrow?.x ?? "",
              position: "absolute",
            },
          },
        })}
      </FloatingPortal>
    </>
  );
}

export function PopoverSimple({
  placement,
  reference,
  floating,
}: {
  placement: Placement;
  reference: React.ReactElement;
  floating: React.ReactElement;
}) {
  return (
    <Popover
      placement={placement}
      reference={({ props, open, setOpen }) =>
        React.cloneElement(reference, {
          onClick: () => setOpen(!open),
          ...props,
        })
      }
      floating={({ props, open, arrowProps, context: { placement } }) => (
        <Transition
          show={open}
          className="transition duration-200"
          enterFrom="scale-90 opacity-0"
          enterTo="scale-100 opacity-100"
          leaveFrom="scale-100 opacity-100"
          leaveTo="scale-90 opacity-0"
          {...props}
        >
          <div className="bg-base-100 text-base-content shadow">
            <div
              {...arrowProps}
              className={cls(
                placement.startsWith("bottom") && "top-0",
                placement.startsWith("top") && "bottom-0",
                placement.startsWith("left") && "right-0",
                placement.startsWith("right") && "left-0"
              )}
            >
              <div
                // rotate 4x4 square with shadow
                className={cls(
                  "bg-base-100 shadow relative w-4 h-4",
                  placement.startsWith("bottom") && "-top-2 rotate-[225deg]",
                  placement.startsWith("top") && "-bottom-2 rotate-[45deg]",
                  placement.startsWith("left") && "-right-2 rotate-[315deg]",
                  placement.startsWith("right") && "-left-2 rotate-[135deg]"
                )}
                // clip half
                style={{
                  clipPath: "polygon(100% 0%, 200% 100%, 100% 200%, 0% 100%)",
                }}
              />
            </div>
            {floating}
          </div>
        </Transition>
      )}
    />
  );
}
