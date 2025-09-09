import baseConfig, { restrictEnvAccess } from "@splashin/eslint-config/base";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: ["script/**"],
  },
  ...baseConfig,
  ...restrictEnvAccess,
];
