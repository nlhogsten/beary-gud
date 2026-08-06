import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(moduleDirectory, "../../../.env.local") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize @voxl/db/client.");
}

const sql = postgres(databaseUrl, { max: 5 });

export const db = drizzle(sql);

export async function closeDb() {
  await sql.end();
}
