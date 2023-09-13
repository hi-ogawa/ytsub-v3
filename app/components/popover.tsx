import {
  FloatingContext,
  Placement,
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from "@floating-ui/react";
import { Transition } from "@hiogawa/tiny-transition/dist/react";
import React from "react";
import { cls } from "../utils/misc";
import { FloatingWrapper } from "./floating-utils";

// based on https://github.com/hi-ogawa/unocss-preset-antd/blob/95b2359ca2a7bcec3ccc36762fae4929937b628e/packages/app/src/components/popover.tsx

interface PopoverRenderProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  props: {};
  arrowProps?: {};
  context: FloatingContext;
}

function Popover(props: {
  placement: Placement;
  reference: (renderProps: PopoverRenderProps) => React.ReactNode;
  floating: (renderProps: PopoverRenderProps) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const arrowRef = React.useRef<Element>(null);

  const { refs, context, x, y, strategy, middlewareData } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: props.placement,
    middleware: [
      offset(16),
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

  return (
    <>
      {props.reference({
        context,
        open,
        setOpen,
        props: getReferenceProps({
          ref: refs.setReference,
        }),
      })}
      <FloatingWrapper>
        {props.floating({
          context,
          open,
          setOpen,
          props: getFloatingProps({
            ref: refs.setFloating,
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
      </FloatingWrapper>
    </>
  );
}

type RenderElement =
  | React.ReactElement
  | ((context: FloatingContext) => React.ReactElement);

export function PopoverSimple({
  placement,
  reference,
  floating,
  floatingClassName,
}: {
  placement: Placement;
  reference: RenderElement;
  floating: RenderElement;
  floatingClassName?: string;
}) {
  return (
    <Popover
      placement={placement}
      reference={(args) =>
        React.cloneElement(
          typeof reference === "function" ? reference(args.context) : reference,
          args.props
        )
      }
      floating={({ props, open, arrowProps, context }) => (
        <Transition
          show={open}
          className="transition duration-200"
          enterFrom="scale-90 opacity-0"
          enterTo="scale-100 opacity-100"
          leaveFrom="scale-100 opacity-100"
          leaveTo="scale-90 opacity-0"
          {...props}
        >
          <div className={cls("antd-floating", floatingClassName)}>
            <div
              {...arrowProps}
              className={cls(
                context.placement.startsWith("bottom") && "top-0",
                context.placement.startsWith("top") && "bottom-0",
                context.placement.startsWith("left") && "right-0",
                context.placement.startsWith("right") && "left-0"
              )}
            >
              <div
                // rotate 4x4 square with shadow
                // prettier-ignore
                className={cls(
                  "antd-floating !shadow relative w-4 h-4",
                  context.placement.startsWith("bottom") && "-top-2 rotate-[225deg]",
                  context.placement.startsWith("top") && "-bottom-2 rotate-[45deg]",
                  context.placement.startsWith("left") && "-right-2 rotate-[315deg]",
                  context.placement.startsWith("right") && "-left-2 rotate-[135deg]"
                )}
                // clip half
                style={{
                  clipPath: "polygon(100% 0%, 200% 100%, 100% 200%, 0% 100%)",
                }}
              />
            </div>
            {typeof floating === "function" ? floating(context) : floating}
          </div>
        </Transition>
      )}
    />
  );
}
