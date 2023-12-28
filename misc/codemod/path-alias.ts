import path from "node:path";
import type { Transform } from "jscodeshift";
import * as recast from "recast";

/*
usage
  npx jscodeshift --parser tsx --extensions ts,tsx --transform ./misc/codemod/path-alias.ts $(git grep -l . 'app/*.ts' 'app/*.tsx')
*/

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;
  const $j = j(file.source);

  for (const jPath of $j.find(j.ImportDeclaration).paths()) {
    const node = jPath.value;
    const code = recast.print(node).code.trim();
    const location = `${file.path}:${node.loc?.start.line}`;
    if (process.env.DEBUG?.includes("1")) {
      console.error("[debug]", location, "-", node.source.value, code);
    }

    if (j.StringLiteral.check(node.source)) {
      const source = node.source.value;
      if (source.startsWith(".")) {
        // [example]
        // path.relative("app", path.join("app/misc/initialize-server.ts", "..", "../utils/config"));
        // => "utils/config"
        const newSource = path.relative(
          "app",
          path.join(file.path, "..", source)
        );
        node.source.value = "#" + newSource;
        if (process.env.DEBUG?.includes("2")) {
          console.log("[debug]", location, [
            file.path,
            source,
            newSource,
          ]);
        }
      }
    }
  }

  return $j.toSource();
};

export default transform;
