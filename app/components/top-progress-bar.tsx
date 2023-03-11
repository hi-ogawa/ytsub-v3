import BarOfProgress from "@badrap/bar-of-progress";
import * as React from "react";

export function TopProgressBar({ loading }: { loading: boolean }) {
  const [barOfProgress] = React.useState(
    () =>
      new BarOfProgress({
        size: 3,
        // daisy-ui secondary
        color: "hsl(314 100% 47%)",
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
