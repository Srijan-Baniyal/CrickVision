import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Mirror of Clerk user IDs. We don't sync profile data — it lives in Clerk.
// Kept locally so we can foreign-key from `matches` and own analytics scope.
export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
