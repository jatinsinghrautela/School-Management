import { defineConfig } from "vite";
export default defineConfig({
  server: {
    proxy: { "/api": "http://127.0.0.1:4000" },
    // Wait for file writers to finish before invalidating cached modules.
    watch: { awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } },
  },
});
