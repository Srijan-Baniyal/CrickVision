import { sql } from "drizzle-orm";
import {
  bigint,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { matches } from "./matches";

export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  blobUrl: text("blob_url").notNull(),
  durationSec: numeric("duration_sec", { precision: 10, scale: 3 }),
  widthPx: integer("width_px"),
  heightPx: integer("height_px"),
  fps: numeric("fps", { precision: 6, scale: 3 }),
  byteSize: bigint("byte_size", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
