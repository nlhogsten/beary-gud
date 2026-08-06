import { Hono } from "hono";
import { cors } from "hono/cors";
import { createServerEngineRegistry } from "./registry.ts";

export function createApp() {
  const app = new Hono();
  const registry = createServerEngineRegistry();

  app.use("/api/*", cors({
    origin: ["http://127.0.0.1:5740", "http://localhost:5740"],
  }));

  app.get("/api/health", (context) => context.json({
    ok: true,
    service: "voxl-server",
  }));

  app.get("/api/engines", (context) => context.json({
    engines: registry.list(),
  }));

  app.notFound((context) => context.json({
    error: {
      code: "not_found",
      message: "The requested VOXL route does not exist.",
    },
  }, 404));

  return app;
}

export const app = createApp();
