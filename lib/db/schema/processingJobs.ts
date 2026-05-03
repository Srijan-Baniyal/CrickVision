import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { processingStatusEnum } from "./enums";
import { matches } from "./matches";

// Mirror of Inngest job state for fast UI lookups + audit trail. Inngest is
// the source of truth for retries; this table is just for "what's happening
// with my match right now?" and SSE filtering.
export const processingJobs = pgTable(
  "processing_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    inngestRunId: text("inngest_run_id"),
    cvJobId: text("cv_job_id"),
    status: processingStatusEnum("status").notNull().default("queued"),
    currentStep: text("current_step"),
    deliveriesExtracted: integer("deliveries_extracted").notNull().default(0),
    errorJson: jsonb("error_json").$type<{
      message: string;
      stack?: string;
    } | null>(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("processing_jobs_match_id_idx").on(table.matchId),
    index("processing_jobs_status_idx").on(table.status),
  ]
);

export type ProcessingJob = typeof processingJobs.$inferSelect;
export type NewProcessingJob = typeof processingJobs.$inferInsert;
