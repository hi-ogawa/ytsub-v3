import { useStableRef } from "@hiogawa/utils-react";
import React from "react";

export function useDocumentEvent<K extends keyof DocumentEventMap>(
  type: K,
  handler: (e: DocumentEventMap[K]) => void
) {
  const handlerRef = useStableRef(handler);

  React.useEffect(() => {
    const handler = (e: DocumentEventMap[K]) => {
      handlerRef.current(e);
    };
    document.addEventListener(type, handler);
    return () => {
      document.removeEventListener(type, handler);
    };
  });
}

export function useClickOutside(callback: () => void) {
  const callbackRef = useStableRef(callback);
  const elRef = useRefAsCallback<Element>();

  // cf. https://github.com/floating-ui/floating-ui/blob/09a3ce259fc35d9c936ad469051ab6ea602a1249/packages/react/src/hooks/useDismiss.ts#L84
  useDocumentEvent("pointerdown", (e) => {
    if (
      elRef.current &&
      e.target instanceof Element &&
      !elRef.current.contains(e.target)
    ) {
      callbackRef.current();
    }
  });

  return elRef.callback;
}

// small typing convenience since jsx `ref={...}` is generous for callback variance
function useRefAsCallback<T>() {
  const ref = React.useRef<T>();
  const refCallback: React.RefCallback<T> = (el) => {
    ref.current = el ?? undefined;
  };
  return {
    callback: React.useCallback(refCallback, []),
    get current() {
      return ref.current;
    },
  };
}