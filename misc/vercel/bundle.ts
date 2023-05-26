import fs from "node:fs";
import esbuild from "esbuild";

// the purposes of this extra build step are:
// - bundle server app into single file for simpler vercel deployment
// - exclude node_modules from generating source map to reduce deployment size

// references
// - https://esbuild.github.io/plugins/
// - https://github.com/evanw/esbuild/issues/1685#issuecomment-944916409

async function main() {
  const [infile, outfile] = process.argv.slice(2);

  await esbuild.build({
    logLevel: "info",
    entryPoints: [infile],
    outfile,
    bundle: true,
    sourcemap: "inline",
    platform: "node",
    plugins: [noSourceMapNodeModulesPlugin()],
  });
}

// https://github.com/evanw/esbuild/issues/1685#issuecomment-944916409
function noSourceMapNodeModulesPlugin(): esbuild.Plugin {
  return {
    name: noSourceMapNodeModulesPlugin.name,
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

main();
