import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    plugins: { react },
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      // Core no-unused-vars cannot see identifiers referenced from JSX, so a
      // component received as a prop (e.g. `{ icon: Icon }` rendered as
      // `<Icon />`) is reported as unused. This rule marks them as used.
      "react/jsx-uses-vars": "error",
      // Core no-undef does not check JSX element names, so a component used as
      // `<Foo />` without an import builds cleanly and only fails at runtime.
      // Essential while components are being extracted out of App.jsx.
      "react/jsx-no-undef": "error",
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
]);
