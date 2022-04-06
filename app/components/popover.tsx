import {
  Placement,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useFloating,
  useFocusTrap,
  useInteractions,
} from "@floating-ui/react-dom-interactions";
import * as React from "react";

interface PopoverRenderProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  props: {};
  update: () => void;
}

interface PopoverProps {
  placement?: Placement;
  reference: (props: PopoverRenderProps) => React.ReactNode;
  floating: (props: PopoverRenderProps) => React.ReactNode;
}

export function Popover(props: PopoverProps) {
  const [open, setOpen] = React.useState(false);

  const { refs, context, update, x, y, strategy } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: props.placement,
    middleware: [offset(5), flip(), shift()],
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useFocusTrap(context, { modal: false, order: ["reference", "content"] }),
  ]);

  React.useEffect(() => {
    if (open && refs.reference.current && refs.floating.current) {
      return autoUpdate(refs.reference.current, refs.floating.current, update);
    }
    return;
  }, [open, refs.reference, refs.floating]);

  return (
    <>
      {props.reference({
        open,
        setOpen,
        update,
        props: getReferenceProps({ ref: refs.reference }),
      })}
      {props.floating({
        open,
        setOpen,
        update,
        props: getFloatingProps({
          ref: refs.floating,
          style: { top: y ?? "", left: x ?? "", position: strategy },
        }),
      })}
    </>
  );
}
