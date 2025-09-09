import baseConfig, { restrictEnvAccess } from "@splashin/eslint-config/base";
import nextjsConfig from "@splashin/eslint-config/nextjs";
import reactConfig from "@splashin/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  ...restrictEnvAccess,
];
