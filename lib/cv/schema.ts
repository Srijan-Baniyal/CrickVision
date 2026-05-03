import { z } from "zod";

// Single source of truth for the CV → Next webhook contract. Drizzle
// (lib/db/schema/*) and Pydantic (services/cv/models.py) MUST stay 1:1 with
// these enums and shapes. See AGENTS.md "Cricket domain glossary" and the
// .cursor/skills/cricket-domain skill.

export const ballTypeSchema = z.enum([
  "yorker",
  "fullToss",
  "full",
  "goodLength",
  "shortOfLength",
  "short",
  "bouncer",
  "beamer",
]);
export type BallType = z.infer<typeof ballTypeSchema>;

export const lineSchema = z.enum([
  "wideOff",
  "outsideOff",
  "offStump",
  "middle",
  "legStump",
  "outsideLeg",
  "wideLeg",
]);
export type Line = z.infer<typeof lineSchema>;

export const swingSchema = z.enum(["out", "in", "reverse", "none"]);
export type Swing = z.infer<typeof swingSchema>;

export const spinSchema = z.enum([
  "offBreak",
  "legBreak",
  "googly",
  "armBall",
  "none",
]);
export type Spin = z.infer<typeof spinSchema>;

export const shotTypeSchema = z.enum([
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
export type ShotType = z.infer<typeof shotTypeSchema>;

export const shotFootworkSchema = z.enum(["frontFoot", "backFoot"]);
export type ShotFootwork = z.infer<typeof shotFootworkSchema>;

export const shotTimingSchema = z.enum([
  "early",
  "wellTimed",
  "late",
  "mistimed",
  "missed",
]);
export type ShotTiming = z.infer<typeof shotTimingSchema>;

export const contactZoneSchema = z.enum(["middle", "edge", "mishit", "miss"]);
export type ContactZone = z.infer<typeof contactZoneSchema>;

export const dismissalTypeSchema = z.enum([
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
export type DismissalType = z.infer<typeof dismissalTypeSchema>;

export const trajectoryPhaseSchema = z.enum([
  "approach",
  "bounce",
  "afterBounce",
  "impact",
  "afterImpact",
]);
export type TrajectoryPhase = z.infer<typeof trajectoryPhaseSchema>;

export const endTerminatorSchema = z.enum([
  "boundary",
  "fielded",
  "wicket",
  "deadBall",
]);
export type EndTerminator = z.infer<typeof endTerminatorSchema>;

const SHOT_DIRECTION_MIN = 0;
const SHOT_DIRECTION_MAX = 360;
const LENGTH_METERS_MAX = 22;
const SPEED_KMH_MIN = 40;
const SPEED_KMH_MAX = 170;

export const trajectoryFrameSchema = z.object({
  tMs: z.number().int().nonnegative(),
  xPitchM: z.number(),
  yPitchM: z.number(),
  zHeightM: z.number(),
  conf: z.number().min(0).max(1),
  phase: trajectoryPhaseSchema,
});
export type TrajectoryFrame = z.infer<typeof trajectoryFrameSchema>;

export const trajectorySchema = z.object({
  frames: z.array(trajectoryFrameSchema).min(1),
});
export type Trajectory = z.infer<typeof trajectorySchema>;

export const pitchPointSchema = z.object({
  xPitchM: z.number(),
  yPitchM: z.number(),
  conf: z.number().min(0).max(1),
});
export type PitchPoint = z.infer<typeof pitchPointSchema>;

export const impactPointSchema = z.object({
  xPitchM: z.number(),
  yPitchM: z.number(),
  zHeightM: z.number(),
  conf: z.number().min(0).max(1),
});
export type ImpactPoint = z.infer<typeof impactPointSchema>;

export const endPointSchema = z.object({
  xPitchM: z.number(),
  yPitchM: z.number(),
  terminator: endTerminatorSchema,
  conf: z.number().min(0).max(1),
});
export type EndPoint = z.infer<typeof endPointSchema>;

export const confidenceMapSchema = z.record(
  z.string(),
  z.number().min(0).max(1)
);
export type ConfidenceMap = z.infer<typeof confidenceMapSchema>;

// Full payload sent by services/cv/pipeline/aggregate.py per delivery.
// Validation rules from .cursor/skills/cricket-domain are enforced via
// .superRefine so a single contract drives webhook ingestion.
export const deliverySchema = z
  .object({
    matchId: z.string().uuid(),
    overNumber: z.number().int().nonnegative(),
    ballInOver: z.number().int().min(1).max(20),

    videoStartMs: z.number().int().nonnegative().nullable(),
    videoEndMs: z.number().int().nonnegative().nullable(),
    clipBlobUrl: z.string().url().nullable(),

    ballType: ballTypeSchema.nullable(),
    line: lineSchema.nullable(),
    lengthMeters: z.number().min(0).max(LENGTH_METERS_MAX).nullable(),
    speedKmh: z.number().min(SPEED_KMH_MIN).max(SPEED_KMH_MAX).nullable(),
    swing: swingSchema.nullable(),
    spin: spinSchema.nullable(),

    bowlerName: z.string().nullable(),
    batsmanName: z.string().nullable(),
    nonStrikerName: z.string().nullable(),

    shotType: shotTypeSchema.nullable(),
    shotFootwork: shotFootworkSchema.nullable(),
    shotTiming: shotTimingSchema.nullable(),
    shotDirectionDeg: z
      .number()
      .min(SHOT_DIRECTION_MIN)
      .lt(SHOT_DIRECTION_MAX)
      .nullable(),
    contactZone: contactZoneSchema.nullable(),

    runs: z.number().int().min(0).max(6),
    isBoundary: z.boolean(),
    isSix: z.boolean(),
    isWicket: z.boolean(),
    dismissalType: dismissalTypeSchema,
    fielderName: z.string().nullable(),

    trajectory: trajectorySchema.nullable(),
    pitchPoint: pitchPointSchema.nullable(),
    impactPoint: impactPointSchema.nullable(),
    endPoint: endPointSchema.nullable(),

    confidence: confidenceMapSchema.default({}),
    commentary: z.string().nullable(),
    debug: z
      .object({
        geminiRaw: z.unknown().optional(),
        trackSummary: z
          .object({
            frames: z.number().int().nonnegative(),
            lostAtMs: z.number().int().nonnegative().optional(),
            reacquiredAtMs: z.number().int().nonnegative().optional(),
          })
          .optional(),
        homographyResidual: z.number().nonnegative().optional(),
        stageDurationsMs: z.record(z.string(), z.number()).optional(),
      })
      .optional(),
    isImageOnly: z.boolean().default(false),
  })
  .superRefine((d, ctx) => {
    if (d.isSix && (!d.isBoundary || d.runs !== 6)) {
      ctx.addIssue({
        code: "custom",
        message: "isSix requires isBoundary=true and runs=6",
        path: ["isSix"],
      });
    }
    if (d.dismissalType !== "none" && !d.isWicket) {
      ctx.addIssue({
        code: "custom",
        message: "dismissalType != none requires isWicket=true",
        path: ["dismissalType"],
      });
    }
    if (d.isWicket && d.dismissalType === "none") {
      ctx.addIssue({
        code: "custom",
        message: "isWicket requires dismissalType to be set",
        path: ["dismissalType"],
      });
    }
  });

export type DeliveryPayload = z.infer<typeof deliverySchema>;

// Webhook envelope wrapping deliverySchema with a deduplication key. The CV
// service may retry; the webhook handler must dedupe on (matchId, overNumber,
// ballInOver) per AGENTS.md "Idempotency & validation".
export const cvWebhookEnvelopeSchema = z.object({
  type: z.literal("cv/delivery.extracted"),
  jobId: z.string(),
  delivery: deliverySchema,
});
export type CvWebhookEnvelope = z.infer<typeof cvWebhookEnvelopeSchema>;

export const cvJobCompletedSchema = z.object({
  type: z.literal("cv/job.completed"),
  jobId: z.string(),
  matchId: z.string().uuid(),
  totalDeliveries: z.number().int().nonnegative(),
});
export type CvJobCompleted = z.infer<typeof cvJobCompletedSchema>;

export const cvJobFailedSchema = z.object({
  type: z.literal("cv/job.failed"),
  jobId: z.string(),
  matchId: z.string().uuid(),
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
  }),
});
export type CvJobFailed = z.infer<typeof cvJobFailedSchema>;

export const cvWebhookPayloadSchema = z.discriminatedUnion("type", [
  cvWebhookEnvelopeSchema,
  cvJobCompletedSchema,
  cvJobFailedSchema,
]);
export type CvWebhookPayload = z.infer<typeof cvWebhookPayloadSchema>;
