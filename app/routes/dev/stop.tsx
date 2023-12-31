import process from "process";
import type { LoaderFunction } from "@remix-run/server-runtime";

// gracefully shutdown itself for scripts/test-e2e-coverage.sh

export const loader: LoaderFunction = async () => {
  if (!import.meta.env.DEV) {
    return { success: false };
  }
  console.log("🔥 process.kill 🔥");
  process.kill(process.pid, "SIGINT");
  return { success: true };
};
