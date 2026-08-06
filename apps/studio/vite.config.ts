import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const usePolling = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");
  const serverUrl = env.SERVER_URL ?? "http://127.0.0.1:5741";

  return {
    envDir: "../..",
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 5740,
      proxy: {
        "/api": {
          target: serverUrl,
          changeOrigin: true,
        },
      },
      watch: usePolling ? { useFsEvents: false, usePolling: true } : undefined,
    },
    preview: {
      host: "127.0.0.1",
      port: 5742,
    },
  };
});
