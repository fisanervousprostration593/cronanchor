/// <reference types="vitest/config" />
import { defineConfig } from "vite";

// GitHub Pages serves the site from /<repo>/, so production assets need that base.
// Local dev and `vite preview` use root.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/cronanchor/" : "/",
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/core/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
}));
