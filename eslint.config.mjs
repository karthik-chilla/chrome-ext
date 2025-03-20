import globals from "globals";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import pluginJest from "eslint-plugin-jest";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: ["**/chart.min.js", "**/tests/**"], // Ignore the minified Chart.js file
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.browser,
        chrome: "readonly",
        process: "readonly",
        Chart: "readonly",
        define: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^(err|error)$",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^(err|error)$",
        },
      ],
    },
  },
  {
    files: ["Extension/**/*.js"],
    languageOptions: {
      sourceType: "module",
    },
  },
  {
    files: ["**/*.spec.js", "**/*.test.js"],
    plugins: { jest: pluginJest },
    languageOptions: {
      globals: pluginJest.environments.globals.globals,
    },
    rules: {
      "jest/no-disabled-tests": "warn",
      "jest/no-focused-tests": "error",
      "jest/no-identical-title": "error",
      "jest/prefer-to-have-length": "warn",
      "jest/valid-expect": "error",
    },
  },
  pluginJs.configs.recommended,
  eslintConfigPrettier,
];
