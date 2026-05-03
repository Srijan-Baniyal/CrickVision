import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { matches } from "./matches";

export const innings = pgTable(
  "innings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    battingTeam: text("batting_team"),
    bowlingTeam: text("bowling_team"),
    runs: integer("runs").notNull().default(0),
    wickets: integer("wickets").notNull().default(0),
    oversBowled: numeric("overs_bowled", { precision: 5, scale: 1 })
      .notNull()
      .default("0.0"),
  },
  (table) => [
    index("innings_match_id_idx").on(table.matchId),
    uniqueIndex("innings_match_number_unique").on(table.matchId, table.number),
  ]
);

export type Innings = typeof innings.$inferSelect;
export type NewInnings = typeof innings.$inferInsert;
