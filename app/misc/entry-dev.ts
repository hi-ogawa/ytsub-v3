import * as build from "@remix-run/dev/server-build";
import { createRequestHandler } from "@remix-run/express"
import { createApp } from "@remix-run/serve"

// const requestHandler = createRequestHandler({ build });


function main() {
  const app = createApp(
    "./build/remix/development/server/index.js",
    "production",
    "/build/remix/development/public/build",
    "build/remix/development/public/build",
  )

  // const server = createServer(hattipHandler);
  // server.listen(3000, "localhost", () => {
  //   console.log("server started at http://localhost:3000");
  // });
}

// main();
