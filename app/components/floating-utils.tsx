import {
  FloatingNode,
  FloatingPortal,
  useFloating,
  useFloatingNodeId,
} from "@floating-ui/react";

// https://floating-ui.com/docs/floatingtree

export function FloatingWrapper(props: React.PropsWithChildren) {
  const nodeId = useFloatingNodeId();

  useFloating({ nodeId });

  return (
    <FloatingNode id={nodeId}>
      <FloatingPortal>{props.children}</FloatingPortal>
    </FloatingNode>
  );
}
