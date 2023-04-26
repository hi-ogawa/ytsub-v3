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

// TODO: to utils
// wrapper to create RefCallback by useEffect like api
function useRefCallbackEffect<T>(effect: (value: T) => () => void) {
  const stableEffect = useStableCallback(effect);
  const destructorRef = React.useRef<() => void>();

  const refCallback: React.RefCallback<T> = (value) => {
    if (value) {
      destructorRef.current = stableEffect(value);
    } else {
      destructorRef.current?.();
    }
  };

  return React.useCallback(refCallback, []);
}

// TODO: to utils
// https://github.com/facebook/react/issues/14099#issuecomment-440013892
function useStableCallback<F extends (...args: any[]) => any>(callback: F): F {
  const ref = React.useRef(callback);

  // silence SSR useLayoutEffect warning until https://github.com/facebook/react/pull/26395
  const useEffect =
    typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

  useEffect(() => {
    ref.current = callback;
  });

  return React.useCallback((...args: any[]) => ref.current(...args), []) as any;
}
