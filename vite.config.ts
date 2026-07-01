import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/manutencao_locabox/" : "/",
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    allowedHosts: ["127.0.0.1", "localhost"],
    fs: {
      strict: false
    },
    proxy: {
      "/api": "http://127.0.0.1:4174"
    }
  }
});
