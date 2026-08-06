import { app } from "./app.ts";

const port = Number(process.env.PORT ?? 5741);
const hostname = process.env.HOST ?? "127.0.0.1";

const server = Bun.serve({
  hostname,
  port,
  fetch: app.fetch,
});

console.log(`VOXL server listening on ${server.url}`);

function shutdown() {
  void server.stop(true);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
