import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { deliveries } from "./deliveries";
import { eventTypeEnum } from "./enums";

// Extensibility for things that don't fit the per-delivery row: extras,
// reviews, free hits. One delivery may have multiple events.
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    note: text("note"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [index("events_delivery_id_idx").on(table.deliveryId)]
);

export type CricketEvent = typeof events.$inferSelect;
export type NewCricketEvent = typeof events.$inferInsert;
