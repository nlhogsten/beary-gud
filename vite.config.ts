import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const usePolling = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    watch: usePolling ? { useFsEvents: false, usePolling: true } : undefined,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
  },
});
