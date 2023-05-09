import { execSync } from "child_process";
import fs from "node:fs";
import esbuild from "esbuild";
import type { buildConfig } from "../../app/utils/config";

// used by scripts/vercel.sh to
// - bundle server app for simpler vercel deployment
// - exclude node_modules from generating source map to reduce deployment size

// references
// - https://esbuild.github.io/plugins/
// - https://github.com/evanw/esbuild/issues/1685#issuecomment-944916409

const GIT_COMMIT_REF = execSync("git rev-parse HEAD", {
  encoding: "utf8",
}).trim();

const BUILD_CONFIG_DEFINE: typeof buildConfig = {
  GIT_COMMIT_REF,
};

esbuild.build({
  logLevel: "info",
  entryPoints: ["./build/remix/production/server/index.js"],
  outfile: "./build/remix/production/server/index-bundled.js",
  bundle: true,
  sourcemap: "inline",
  platform: "node",
  external: [
    // exclude knex drivers except "mysql2"
    "mysql",
    "sqlite3",
    "better-sqlite3",
    "tedious",
    "pg",
    "oracledb",
    "pg-query-stream",
  ],
  plugins: [noSourceMapNodeModulesPlugin()],
  define: {
    "process.env.BUILD_CONFIG_DEFINE": JSON.stringify(BUILD_CONFIG_DEFINE),
  },
});

// https://github.com/evanw/esbuild/issues/1685#issuecomment-944916409
function noSourceMapNodeModulesPlugin(): esbuild.Plugin {
  return {
    name: "no-source-map-node-modules",
    setup(build) {
      build.onLoad({ filter: /node_modules/ }, (args) => {
        if (args.path.endsWith("js")) {
          return {
            contents:
              fs.readFileSync(args.path, "utf8") +
              "\n//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJtYXBwaW5ncyI6IkEifQ==",
            loader: "default",
          };
        }
      });
    },
  };
}
