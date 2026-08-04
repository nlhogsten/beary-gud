import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

const root = resolve(import.meta.dirname, "../public");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png" };
createServer(async (request, response) => {
  const requested = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const file = resolve(root, `.${requested}`);
  if (!file.startsWith(root)) { response.writeHead(403); return response.end("Forbidden"); }
  try { response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }); response.end(await readFile(file)); }
  catch { response.writeHead(404); response.end("Not found"); }
}).listen(4173, () => console.log("Transparent Character Studio: http://localhost:4173"));
