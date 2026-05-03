import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { deliveries } from "./deliveries";
import { users } from "./users";

// Every user correction in the DeliveryInspector lands here. A nightly Modal
// job exports this as a fine-tuning batch (see Phase 7). Append-only.
export const deliveryCorrections = pgTable(
  "delivery_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fieldName: text("field_name").notNull(),
    previousValue: jsonb("previous_value"),
    correctedValue: jsonb("corrected_value").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("delivery_corrections_delivery_id_idx").on(table.deliveryId),
    index("delivery_corrections_created_at_idx").on(table.createdAt.desc()),
  ]
);

export type DeliveryCorrection = typeof deliveryCorrections.$inferSelect;
export type NewDeliveryCorrection = typeof deliveryCorrections.$inferInsert;
