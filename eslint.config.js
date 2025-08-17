/* eslint-env node */
import js from "@eslint/js";
import globals from "globals";

export default [
  // 1) Ignoriere große/irrelevante Pfade & Backups
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "public/images/**",
      "public/audio/**",
      "public/videos/**",
      "public/js/*backup*.js",
      ".aider.chat.history.md",
      "package-lock.json",
    ],
  },

  // 2) Basis: moderne JS-Empfehlungen
  js.configs.recommended,

  // 3) Node-Dateien (Server)
  {
    files: ["server.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node, // process, console, etc.
      },
    },
    rules: {
      // Server darf console nutzen
      "no-console": "off",
    },
  },

  // 4) Browser-Dateien (Client)
  {
    files: ["public/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser, // window, document, localStorage, fetch, setTimeout, URL, etc.
        SpeechSynthesisUtterance: "readonly",
        performance: "readonly",
        Audio: "readonly",
        Image: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_", caughtErrors: "none" }],
      // vorübergehend nur Warnung, leere catch-Blöcke erlaubt
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-dupe-else-if": "error",
    },
  },
];