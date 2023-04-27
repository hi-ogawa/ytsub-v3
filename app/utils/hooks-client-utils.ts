import { useRefCallbackEffect, useStableCallback } from "@hiogawa/utils-react";
import React from "react";

function documentEventEffect<K extends keyof DocumentEventMap>(
  type: K,
  handler: (e: DocumentEventMap[K]) => void
) {
  document.addEventListener(type, handler);
  return () => {
    document.removeEventListener(type, handler);
  };
}

export function useDocumentEvent<K extends keyof DocumentEventMap>(
  type: K,
  handler: (e: DocumentEventMap[K]) => void
) {
  const stableHanlder = useStableCallback(handler);

  React.useEffect(() => documentEventEffect(type, stableHanlder), []);
}

export function useClickOutside(callback: (e: PointerEvent) => void) {
  const stableCallback = useStableCallback(callback);

  return useRefCallbackEffect<Element>((el) =>
    documentEventEffect("pointerdown", (e) => {
      if (e.target instanceof Node && el.contains(e.target)) {
        stableCallback(e);
      }
    })
  );
}

export function useIntersectionObserver(
  callback: IntersectionObserverCallback
) {
  const stableCallback = useStableCallback(callback);

  return useRefCallbackEffect<Element>((el) => {
    const observer = new IntersectionObserver(stableCallback);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  });
}
