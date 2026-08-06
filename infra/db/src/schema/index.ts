import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const jobStatus = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("projects_owner_id_idx").on(table.ownerId)]);

export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  engineId: text("engine_id").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("assets_project_id_idx").on(table.projectId)]);

export const assetVersions = pgTable("asset_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  engineVersion: text("engine_version").notNull(),
  parentVersionId: uuid("parent_version_id"),
  document: jsonb("document").notNull(),
  objectKey: text("object_key"),
  checksum: text("checksum").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("asset_versions_asset_number_uidx").on(table.assetId, table.versionNumber),
  index("asset_versions_asset_id_idx").on(table.assetId),
]);

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").references(() => assets.id, { onDelete: "cascade" }),
  engineId: text("engine_id").notNull(),
  status: jobStatus("status").default("queued").notNull(),
  clientRequestId: text("client_request_id").notNull(),
  request: jsonb("request").notNull(),
  resultVersionId: uuid("result_version_id").references(() => assetVersions.id),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("generation_jobs_client_request_uidx").on(table.clientRequestId),
  index("generation_jobs_asset_id_idx").on(table.assetId),
  index("generation_jobs_status_idx").on(table.status),
]);
