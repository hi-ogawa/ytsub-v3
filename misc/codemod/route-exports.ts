/*
Usage

npx jscodeshift --parser tsx --extensions ts,tsx --transform ./misc/codemod/route-exports.ts $(find app/routes -type f ! -name '*.server.*' ! -name '*.test.*' ! -name '*.utils.*')

*/

import { Transform } from "jscodeshift";
import * as recast from "recast";

// https://github.com/remix-run/remix/pull/8171
const ROUTE_EXPORTS = new Set([
  "ErrorBoundary",
  "action",
  "default", // component
  "handle",
  "headers",
  "links",
  "loader",
  "meta",
  "shouldRevalidate",
]);

const transform: Transform = (file, api) => {
  const j = api.jscodeshift;
  const $j = j(file.source);
  for (const path of $j.find(j.ExportNamedDeclaration).paths()) {
    const node = path.value;

    let name: string | undefined;
    ROUTE_EXPORTS.has;

    if (j.VariableDeclaration.check(node.declaration)) {
      if (node.declaration.declarations.length === 1) {
        const node2 = node.declaration.declarations[0];
        if (j.VariableDeclarator.check(node2) && j.Identifier.check(node2.id)) {
          name = node2.id.name;
        }
      }
    } else if (j.FunctionDeclaration.check(node.declaration)) {
      if (node.declaration.id) {
        name = node.declaration.id.name;
      }
    } else {
      continue;
    }

    const location = `${file.path}:${node.loc?.start.line}`;
    if (!name) {
      const code = recast.print(node).code.trim();
      console.error("[error:unknown-export]", location, "-", code);
      continue;
    }

    if (ROUTE_EXPORTS.has(name)) {
      continue;
    }

    console.log("[error:bad-export]", location, name);
  }
};

export default transform;
