import { createServer } from "node:http";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(import.meta.dirname, "..");
const publicRoot = resolve(projectRoot, "public");
const logDirectory = resolve(projectRoot, "logs");
const logFile = resolve(logDirectory, "dev-server.log");
const port = Number(process.env.PORT) || 4173;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
};

await mkdir(logDirectory, { recursive: true });

async function log(level, message, details = {}) {
  const entry = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...details,
  });
  console[level === "error" ? "error" : "log"](entry);
  try {
    await appendFile(logFile, `${entry}\n`, "utf8");
  } catch (error) {
    console.error(`Unable to append to ${logFile}: ${error.message}`);
  }
}

function requestPath(url = "/") {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  if (pathname === "/" || pathname === "/compatibility/") {
    return "/compatibility/index.html";
  }
  return pathname;
}

function publicFileFor(url) {
  const pathname = requestPath(url);
  const file = resolve(publicRoot, `.${pathname}`);
  const insidePublicRoot = file === publicRoot || file.startsWith(`${publicRoot}${sep}`);
  return { file, insidePublicRoot, pathname };
}

export function createStudioServer() {
  return createServer(async (request, response) => {
    const startedAt = performance.now();
    const finish = (status, body, headers = {}) => {
      if (response.headersSent || response.writableEnded) return;
      response.writeHead(status, {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
        ...headers,
      });
      response.end(request.method === "HEAD" ? undefined : body);
    };

    try {
      if (!request.url) {
        finish(400, "Bad request");
        return;
      }

      if (!["GET", "HEAD"].includes(request.method ?? "")) {
        finish(405, "Method not allowed", { allow: "GET, HEAD" });
        return;
      }

      if (requestPath(request.url) === "/api/health") {
        finish(200, JSON.stringify({ ok: true }), { "content-type": contentTypes[".json"] });
        return;
      }

      const { file, insidePublicRoot, pathname } = publicFileFor(request.url);
      if (!insidePublicRoot) {
        finish(403, "Forbidden");
        return;
      }

      // Read before writing headers. A missing file can now cleanly return 404
      // instead of attempting a second writeHead and crashing the process.
      let body;
      try {
        body = await readFile(file);
      } catch (error) {
        const status = error.code === "ENOENT" || error.code === "EISDIR" ? 404 : 500;
        finish(status, status === 404 ? "Not found" : "Unable to read file");
        if (status === 500) await log("error", "static_file_read_failed", { pathname, error: error.message });
        return;
      }

      finish(200, body, { "content-type": contentTypes[extname(file).toLowerCase()] ?? "application/octet-stream" });
    } catch (error) {
      finish(500, "Internal server error");
      await log("error", "request_failed", { url: request.url, error: error.stack ?? error.message });
    } finally {
      await log("info", "request", {
        method: request.method,
        url: request.url,
        status: response.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
      });
    }
  });
}

function installProcessLogging() {
  process.on("uncaughtException", async (error) => {
    await log("error", "uncaught_exception", { error: error.stack ?? error.message });
    process.exitCode = 1;
  });
  process.on("unhandledRejection", async (reason) => {
    const error = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
    await log("error", "unhandled_rejection", { error });
  });
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  installProcessLogging();
  const server = createStudioServer();
  server.on("error", (error) => log("error", "server_error", { error: error.stack ?? error.message }));
  server.listen(port, () => {
    log("info", "server_started", { url: `http://localhost:${port}`, logFile });
    console.log(`VOXL compatibility editor: http://localhost:${port}`);
    console.log(`Persistent log: ${logFile}`);
  });
}
