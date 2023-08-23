import BarOfProgress from "@badrap/bar-of-progress";
import { useNavigation } from "@remix-run/react";
import React from "react";

function TopProgressBar({ loading }: { loading: boolean }) {
  const [barOfProgress] = React.useState(() => new BarOfProgress({ size: 3 }));

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
  const navigation = useNavigation();
  return <TopProgressBar loading={navigation.state !== "idle"} />;
}
