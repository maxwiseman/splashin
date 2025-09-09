import baseConfig from "@splashin/eslint-config/base";
import reactConfig from "@splashin/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["dist/**"],
  },
  ...baseConfig,
  ...reactConfig,
];
