import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", ".expo/**", "dist/**", "build/**"] },
  { files: ["**/*.{js,mjs,cjs,jsx}"] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/display-name": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];
