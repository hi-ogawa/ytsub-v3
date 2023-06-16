import { once } from "@hiogawa/utils";
import React from "react";

// workaround StrictMode double effect
export function useEffectNoStrict(...args: Parameters<typeof React.useEffect>) {
  return React.useEffect(once(args[0]), args[1]);
}

let __hydrated = false;

function useHydrated() {
  const [ok, setOk] = React.useState(__hydrated);

  React.useEffect(() => {
    setOk((__hydrated = true));
  }, []);

  return ok;
}

export function ClientOnly(props: React.PropsWithChildren) {
  const hydrated = useHydrated();
  return <>{hydrated && props.children}</>;
}
