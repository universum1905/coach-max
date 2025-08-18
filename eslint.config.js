/* eslint-env node */
import js from "@eslint/js";
import globals from "globals";

export default [
  // Ignorieren (macht die Läufe schneller/ruhiger)
  { ignores: ["**/node_modules/**","**/dist/**","**/build/**","public/images/**","public/audio/**","public/videos/**","public/js/*backup*.js",".aider.chat.history.md","package-lock.json"] },

  // Basisregeln
  { ...js.configs.recommended },

  // Node (Server)
  {
    files: ["server.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node } },
    rules: { "no-unused-vars": ["warn",{ args:"none", varsIgnorePattern:"^_", caughtErrors:"none"}] }
  },

  // Browser (Client)
  {
    files: ["public/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022, sourceType: "module",
      globals: { ...globals.browser, SpeechSynthesisUtterance:"readonly", performance:"readonly", Audio:"readonly", Image:"readonly" }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn",{ args:"none", varsIgnorePattern:"^_", caughtErrors:"none"}],
      "no-dupe-else-if": "error"
    }
  }
];