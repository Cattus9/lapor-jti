import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/features/reports/domain/**/*.{ts,tsx}", "src/features/reports/application/**/*.{ts,tsx}", "src/features/lost-found/domain/**/*.{ts,tsx}", "src/features/lost-found/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["react", "react/*", "next", "next/*", "drizzle-orm", "drizzle-orm/*", "better-auth", "better-auth/*", "node:*", "server-only", "@/db", "@/db/*", "@/components/*", "**/components/**", "**/infrastructure/**", "**/server"], message: "Report domain/application must depend on pure contracts, not UI, framework, database, or infrastructure." },
        ],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
