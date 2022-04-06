/** @type {import("@typescript-eslint/utils").TSESLint.Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "eslint-plugin-import"],
  extends: ["prettier"],
  rules: {
    "import/order": ["error"],
    "sort-imports": ["error", { ignoreDeclarationSort: true }],
  },
  ignorePatterns: [".cache", "build", "node_modules"],
};
