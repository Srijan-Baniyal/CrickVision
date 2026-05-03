import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { playerRoleEnum } from "./enums";
import { matches } from "./matches";

export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: playerRoleEnum("role").notNull().default("batter"),
    teamName: text("team_name"),
  },
  (table) => [index("players_match_id_idx").on(table.matchId)]
);

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;
