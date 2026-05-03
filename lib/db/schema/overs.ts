import {
  index,
  integer,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { innings } from "./innings";
import { players } from "./players";

export const overs = pgTable(
  "overs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inningsId: uuid("innings_id")
      .notNull()
      .references(() => innings.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    bowlerId: uuid("bowler_id").references(() => players.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("overs_innings_id_idx").on(table.inningsId),
    uniqueIndex("overs_innings_number_unique").on(
      table.inningsId,
      table.number
    ),
  ]
);

export type Over = typeof overs.$inferSelect;
export type NewOver = typeof overs.$inferInsert;
