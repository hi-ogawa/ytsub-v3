import BarOfProgress from "@badrap/bar-of-progress";
import { useTransition } from "@remix-run/react";
import React from "react";

function TopProgressBar({ loading }: { loading: boolean }) {
  const [barOfProgress] = React.useState(
    () =>
      new BarOfProgress({
        size: 3,
        // daisy-ui secondary
        // color: "hsl(314 100% 47%)",
      })
  );

  React.useEffect(() => {
    if (loading) {
      barOfProgress.start();
    } else {
      barOfProgress.finish();
    }
  }, [loading]);

  return null;
}

export function TopProgressBarRemix() {
  const transition = useTransition();
  return <TopProgressBar loading={transition.state !== "idle"} />;
}
