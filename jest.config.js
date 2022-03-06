/** @type {import("@babel/core").TransformOptions} */
const BABEL_CONFIG = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          node: "current",
        },
      },
    ],
    "@babel/preset-react",
    "@babel/preset-typescript",
  ],
};

/** @type {import('@jest/types').Config.InitialOptions} */
const JEST_CONFIG = {
  testEnvironment: "jsdom",
  roots: ["app"],
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  transform: {
    "\\.tsx?$": ["babel-jest", BABEL_CONFIG],
  },
};

module.exports = JEST_CONFIG;
