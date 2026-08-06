import express from "express";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(import.meta.dirname, "..");
const defaultDistRoot = resolve(projectRoot, "dist");

export function createProductionApp({ distRoot = defaultDistRoot } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.get("/api/health", (_request, response) => {
    response.json({ ok: true, service: "voxl-studio" });
  });
  app.use(express.static(distRoot, {
    index: false,
    setHeaders(response, filePath) {
      if (filePath.includes("/assets/")) {
        response.setHeader("cache-control", "public, max-age=31536000, immutable");
      } else {
        response.setHeader("cache-control", "no-cache");
      }
    },
  }));
  app.use((request, response, next) => {
    if (request.method !== "GET" && request.method !== "HEAD") return next();
    response.setHeader("cache-control", "no-cache");
    return response.sendFile(resolve(distRoot, "index.html"));
  });

  return app;
}

async function start() {
  await access(resolve(defaultDistRoot, "index.html"));
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || "127.0.0.1";
  const app = createProductionApp();
  app.listen(port, host, () => {
    console.log(`VOXL Studio listening on http://${host}:${port}`);
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  start().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
