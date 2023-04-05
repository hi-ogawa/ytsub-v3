import { useStableRef } from "@hiogawa/utils-react";
import React from "react";
import { deserialize } from "./controller-utils";

export function useIsFormValid() {
  const ref = React.useRef<HTMLFormElement>(null);
  const [isValid, setIsValid] = React.useState(false);
  React.useEffect(onChange, []);

  function onChange() {
    setIsValid(!!ref.current?.checkValidity());
  }

  const formProps = { ref, onChange };

  return [isValid, formProps] as const;
}

function useMemoWrap<F extends (_: D) => any, D>(f: F, data: D): ReturnType<F> {
  return React.useMemo(() => f(data), [data]);
}

export function useDeserialize(data: any): any {
  return useMemoWrap(deserialize, data);
}

export function useSelection(listener: (selection?: Selection) => void) {
  const listenerRef = useStableRef(listener);

  React.useEffect(() => {
    function listenerImpl() {
      listenerRef.current(document.getSelection() ?? undefined);
    }
    document.addEventListener("selectionchange", listenerImpl);
    return () => {
      document.removeEventListener("selectionchange", listenerImpl);
    };
  }, []);
}
