import { defineConfig } from "vite";

export default defineConfig({
  // Relative paths so the build works from a GitHub Pages sub-path.
  base: "./",
  server: { port: 5173, strictPort: true },
});
