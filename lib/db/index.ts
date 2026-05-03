import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/env";
import { deliveries } from "./schema/deliveries";
import { deliveryCorrections } from "./schema/deliveryCorrections";
import { events } from "./schema/events";
import { innings } from "./schema/innings";
import { matches } from "./schema/matches";
import { overs } from "./schema/overs";
import { players } from "./schema/players";
import { processingJobs } from "./schema/processingJobs";
import { users } from "./schema/users";
import { videos } from "./schema/videos";

const schema = {
  users,
  matches,
  videos,
  players,
  innings,
  overs,
  deliveries,
  events,
  processingJobs,
  deliveryCorrections,
};

const sql = neon(env.DATABASE_URL);

export const db = drizzle({ client: sql, schema });

export type Database = typeof db;
