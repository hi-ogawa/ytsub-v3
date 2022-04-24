import { LoaderFunction } from "@remix-run/server-runtime";

export const loader: LoaderFunction = async () => {
  if (process.env.NODE_ENV === "production") {
    return { success: false };
  }
  console.log("🔥🔥🔥 process.exit(0) 🔥🔥🔥");
  setTimeout(() => process.exit(0));
  return { success: true };
};
