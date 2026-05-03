import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { matchFormatEnum, matchStatusEnum, sourceKindEnum } from "./enums";
import { users } from "./users";

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    format: matchFormatEnum("format").notNull(),
    venue: text("venue"),
    homeTeam: text("home_team"),
    awayTeam: text("away_team"),
    sourceKind: sourceKindEnum("source_kind").notNull(),
    sourceRef: text("source_ref"),
    status: matchStatusEnum("status").notNull().default("uploading"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("matches_user_id_idx").on(table.userId),
    index("matches_status_idx").on(table.status),
    index("matches_created_at_idx").on(table.createdAt.desc()),
  ]
);

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
