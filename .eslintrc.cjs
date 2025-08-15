// Lint: block raw console.* usage in src/** and encourage the logger.
// Allow console in Edge Functions (server) but prefer slog.
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist/**", "build/**", "node_modules/**"],
  rules: {
    // Disallow console.* across the frontend, except warn/error in rare cases.
    "no-console": ["error", { allow: ["warn", "error"] }],
    // Optional: keep codebase clean from accidental debugger
    "no-debugger": "error",
  },
  overrides: [
    // Allow console inside the frontend logger implementation.
    {
      files: ["src/utils/logger.ts"],
      rules: { "no-console": "off" },
    },
    // Edge Functions are server-side; allow console but encourage slog.
    {
      files: ["supabase/functions/**/*.ts"],
      rules: { "no-console": "off" },
    },
  ],
};