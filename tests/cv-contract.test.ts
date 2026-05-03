import { describe, expect, it } from "vitest";
import {
  ballTypeSchema,
  cvWebhookEnvelopeSchema,
  deliverySchema,
  shotTypeSchema,
} from "@/lib/cv/schema";

// Mirror of the canned data in services/cv/stubs/deliveries.json. If you
// change the fixture, change this — kept in lockstep so the test exercises
// the exact wire format.
const stubDelivery = {
  matchId: "00000000-0000-0000-0000-000000000000",
  overNumber: 1,
  ballInOver: 1,
  videoStartMs: 0,
  videoEndMs: 5000,
  clipBlobUrl: null,
  ballType: "goodLength",
  line: "offStump",
  lengthMeters: 7.2,
  speedKmh: 138.4,
  swing: "out",
  spin: "none",
  bowlerName: null,
  batsmanName: null,
  nonStrikerName: null,
  shotType: "defensive",
  shotFootwork: "frontFoot",
  shotTiming: "wellTimed",
  shotDirectionDeg: 12.0,
  contactZone: "middle",
  runs: 0,
  isBoundary: false,
  isSix: false,
  isWicket: false,
  dismissalType: "none",
  fielderName: null,
  trajectory: {
    frames: [
      {
        tMs: 0,
        xPitchM: 0.1,
        yPitchM: 18.0,
        zHeightM: 2.0,
        conf: 0.9,
        phase: "approach",
      },
      {
        tMs: 200,
        xPitchM: 0.0,
        yPitchM: 7.2,
        zHeightM: 0.05,
        conf: 0.8,
        phase: "bounce",
      },
      {
        tMs: 400,
        xPitchM: 0.0,
        yPitchM: 1.0,
        zHeightM: 0.6,
        conf: 0.85,
        phase: "impact",
      },
    ],
  },
  pitchPoint: { xPitchM: 0.0, yPitchM: 7.2, conf: 0.85 },
  impactPoint: {
    xPitchM: 0.0,
    yPitchM: 1.0,
    zHeightM: 0.6,
    conf: 0.8,
  },
  endPoint: {
    xPitchM: 0.0,
    yPitchM: 0.5,
    terminator: "fielded",
    conf: 0.7,
  },
  confidence: { pitchPoint: 0.85 },
  commentary: "Pitched on a length, defended back to the bowler.",
  isImageOnly: false,
};

describe("CV contract", () => {
  it("parses a stub Delivery payload via Zod", () => {
    const parsed = deliverySchema.parse(stubDelivery);
    expect(parsed.ballType).toBe("goodLength");
    expect(parsed.trajectory?.frames).toHaveLength(3);
  });

  it("parses the full webhook envelope", () => {
    const env = cvWebhookEnvelopeSchema.parse({
      type: "cv/delivery.extracted",
      jobId: "test-job",
      delivery: stubDelivery,
    });
    expect(env.delivery.shotType).toBe("defensive");
  });

  it("rejects an unknown ballType (LLM hallucination guard)", () => {
    expect(() =>
      deliverySchema.parse({ ...stubDelivery, ballType: "knuckleBall" })
    ).toThrow();
  });

  it("rejects isSix=true with runs=4 (consistency rule)", () => {
    expect(() =>
      deliverySchema.parse({
        ...stubDelivery,
        runs: 4,
        isBoundary: true,
        isSix: true,
      })
    ).toThrow();
  });

  it("rejects isWicket=true with dismissalType='none'", () => {
    expect(() =>
      deliverySchema.parse({
        ...stubDelivery,
        isWicket: true,
        dismissalType: "none",
      })
    ).toThrow();
  });

  it("ballTypeSchema and shotTypeSchema enums match the docs", () => {
    expect(ballTypeSchema.options).toContain("yorker");
    expect(ballTypeSchema.options).toContain("bouncer");
    expect(shotTypeSchema.options).toContain("scoop");
    expect(shotTypeSchema.options).toContain("reverseSweep");
  });
});
