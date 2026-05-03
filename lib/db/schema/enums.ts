import { pgEnum } from "drizzle-orm/pg-core";

// Cricket domain enums — values are the single source of truth, mirrored in
// lib/cv/schema.ts (Zod), services/cv/models.py (Pydantic), and the Gemini
// structured-output schema. See AGENTS.md "Cricket domain glossary" and the
// .cursor/skills/cricket-domain skill.

export const matchFormatEnum = pgEnum("match_format", [
  "T20",
  "ODI",
  "Test",
  "Highlights",
  "Image",
]);

export const sourceKindEnum = pgEnum("source_kind", [
  "upload",
  "url",
  "image",
  "live",
  "pwa",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "uploading",
  "processing",
  "ready",
  "failed",
]);

export const playerRoleEnum = pgEnum("player_role", [
  "batter",
  "bowler",
  "allRounder",
  "wk",
]);

export const ballTypeEnum = pgEnum("ball_type", [
  "yorker",
  "fullToss",
  "full",
  "goodLength",
  "shortOfLength",
  "short",
  "bouncer",
  "beamer",
]);

export const lineEnum = pgEnum("delivery_line", [
  "wideOff",
  "outsideOff",
  "offStump",
  "middle",
  "legStump",
  "outsideLeg",
  "wideLeg",
]);

export const swingEnum = pgEnum("delivery_swing", [
  "out",
  "in",
  "reverse",
  "none",
]);

export const spinEnum = pgEnum("delivery_spin", [
  "offBreak",
  "legBreak",
  "googly",
  "armBall",
  "none",
]);

export const shotTypeEnum = pgEnum("shot_type", [
  "defensive",
  "leave",
  "drive",
  "cut",
  "pull",
  "hook",
  "sweep",
  "reverseSweep",
  "scoop",
  "flick",
  "glance",
  "loft",
]);

export const shotFootworkEnum = pgEnum("shot_footwork", [
  "frontFoot",
  "backFoot",
]);

export const shotTimingEnum = pgEnum("shot_timing", [
  "early",
  "wellTimed",
  "late",
  "mistimed",
  "missed",
]);

export const contactZoneEnum = pgEnum("contact_zone", [
  "middle",
  "edge",
  "mishit",
  "miss",
]);

export const dismissalTypeEnum = pgEnum("dismissal_type", [
  "bowled",
  "caught",
  "lbw",
  "runOut",
  "stumped",
  "hitWicket",
  "caughtBehind",
  "caughtAndBowled",
  "none",
]);

export const endTerminatorEnum = pgEnum("end_terminator", [
  "boundary",
  "fielded",
  "wicket",
  "deadBall",
]);

export const processingStatusEnum = pgEnum("processing_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "noBall",
  "wide",
  "bye",
  "legBye",
  "freeHit",
  "review",
  "deadBall",
]);
