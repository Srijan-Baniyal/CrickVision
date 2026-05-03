import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  ballTypeEnum,
  contactZoneEnum,
  dismissalTypeEnum,
  endTerminatorEnum,
  lineEnum,
  shotFootworkEnum,
  shotTimingEnum,
  shotTypeEnum,
  spinEnum,
  swingEnum,
} from "./enums";
import { overs } from "./overs";
import { players } from "./players";

// One row per ball. Geometric fields (pitchPoint, impactPoint, endPoint,
// lengthMeters, line, speedKmh, shotDirectionDeg, shotTiming, shotFootwork)
// are derived in services/cv/pipeline/derive.py from trajectory + pose.
// Semantic fields (ballType, swing, spin, shotType, contactZone,
// dismissalType, commentary) come from Gemini structured output.
// See AGENTS.md "Pipeline correctness rules" for the why.

export interface TrajectoryFrame {
  conf: number;
  phase: "approach" | "bounce" | "afterBounce" | "impact" | "afterImpact";
  tMs: number;
  xPitchM: number;
  yPitchM: number;
  zHeightM: number;
}

export interface Trajectory {
  frames: TrajectoryFrame[];
}

export interface PitchPoint {
  conf: number;
  xPitchM: number;
  yPitchM: number;
}

export interface ImpactPoint {
  conf: number;
  xPitchM: number;
  yPitchM: number;
  zHeightM: number;
}

export interface EndPoint {
  conf: number;
  terminator: "boundary" | "fielded" | "wicket" | "deadBall";
  xPitchM: number;
  yPitchM: number;
}

export type ConfidenceMap = Partial<Record<string, number>>;

export interface DebugBlob {
  geminiRaw?: unknown;
  homographyResidual?: number;
  stageDurationsMs?: Record<string, number>;
  trackSummary?: {
    frames: number;
    lostAtMs?: number;
    reacquiredAtMs?: number;
  };
}

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    overId: uuid("over_id")
      .notNull()
      .references(() => overs.id, { onDelete: "cascade" }),
    ballInOver: integer("ball_in_over").notNull(),
    videoStartMs: integer("video_start_ms"),
    videoEndMs: integer("video_end_ms"),
    clipBlobUrl: text("clip_blob_url"),

    ballType: ballTypeEnum("ball_type"),
    line: lineEnum("line"),
    lengthMeters: numeric("length_meters", { precision: 5, scale: 2 }),
    speedKmh: numeric("speed_kmh", { precision: 5, scale: 1 }),
    swing: swingEnum("swing"),
    spin: spinEnum("spin"),

    bowlerId: uuid("bowler_id").references(() => players.id, {
      onDelete: "set null",
    }),
    batsmanId: uuid("batsman_id").references(() => players.id, {
      onDelete: "set null",
    }),
    nonStrikerId: uuid("non_striker_id").references(() => players.id, {
      onDelete: "set null",
    }),

    shotType: shotTypeEnum("shot_type"),
    shotFootwork: shotFootworkEnum("shot_footwork"),
    shotTiming: shotTimingEnum("shot_timing"),
    shotDirectionDeg: numeric("shot_direction_deg", {
      precision: 6,
      scale: 2,
    }),
    contactZone: contactZoneEnum("contact_zone"),

    runs: integer("runs").notNull().default(0),
    isBoundary: boolean("is_boundary").notNull().default(false),
    isSix: boolean("is_six").notNull().default(false),
    isWicket: boolean("is_wicket").notNull().default(false),
    dismissalType: dismissalTypeEnum("dismissal_type")
      .notNull()
      .default("none"),
    fielderId: uuid("fielder_id").references(() => players.id, {
      onDelete: "set null",
    }),

    trajectory: jsonb("trajectory").$type<Trajectory | null>(),
    pitchPoint: jsonb("pitch_point").$type<PitchPoint | null>(),
    impactPoint: jsonb("impact_point").$type<ImpactPoint | null>(),
    endPoint: jsonb("end_point").$type<EndPoint | null>(),
    endTerminator: endTerminatorEnum("end_terminator"),

    confidence: jsonb("confidence")
      .$type<ConfidenceMap>()
      .notNull()
      .default({}),
    commentary: text("commentary"),
    debugJsonb: jsonb("debug_jsonb").$type<DebugBlob>().notNull().default({}),
    isImageOnly: boolean("is_image_only").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("deliveries_over_id_idx").on(table.overId),
    index("deliveries_bowler_id_idx").on(table.bowlerId),
    index("deliveries_batsman_id_idx").on(table.batsmanId),
    uniqueIndex("deliveries_over_ball_unique").on(
      table.overId,
      table.ballInOver
    ),
  ]
);

export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;
