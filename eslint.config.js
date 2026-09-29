// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const i18next = require("eslint-plugin-i18next");

module.exports = defineConfig([
  expoConfig,
  // design/ holds a standalone review page, not app code.
  { ignores: ["design/**"] },
  {
    ignores: ["dist/*"],
    rules: {
      "no-console": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    // Text lives in src/locales; screens and games must not gain hardcoded
    // text again (see docs/localization-plan.md).
    files: [
      "src/app/**/*.tsx",
      "src/components/{Button,Games,Home,Modals,Nodes,common}/**/*.tsx",
    ],
    ignores: ["src/app/card-back-colors.tsx"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "warn",
        {
          mode: "jsx-only",
          "jsx-attributes": {
            include: [
              "text",
              "label",
              "title",
              "subtitle",
              "description",
              "helpText",
              "placeholder",
              "accessibilityLabel",
            ],
          },
          words: {
            exclude: [
              "[0-9!-/:-@[-`{-~]+",
              "[A-Z_-]+",
              "[\\u2022\\u25E6]",
              "Solitarius",
            ],
          },
          // Translation lookups (t, tCommon, i18n.t) and helpers that take
          // keys rather than text.
          callees: {
            exclude: ["i18n(ext)?", "t", "t[A-Z]\\w*", "renderSortableHeader"],
          },
        },
      ],
    },
  },
]);
