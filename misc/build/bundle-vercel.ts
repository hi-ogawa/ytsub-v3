import fs from "node:fs";
import esbuild from "esbuild";

// used by scripts/vercel.sh to
// - bundle server app for simpler vercel deployment
// - exclude node_modules from generating source map to reduce deployment size

// references
// - https://esbuild.github.io/plugins/
// - https://github.com/evanw/esbuild/issues/1685#issuecomment-944916409

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
