import { and, eq } from "drizzle-orm";
import type { DeliveryPayload } from "@/lib/cv/schema";
import { db } from "@/lib/db";
import {
  type DebugBlob,
  deliveries,
  type EndPoint,
  type ImpactPoint,
  type PitchPoint,
  type Trajectory,
} from "@/lib/db/schema/deliveries";
import { innings } from "@/lib/db/schema/innings";
import { matches } from "@/lib/db/schema/matches";
import { overs } from "@/lib/db/schema/overs";
import { players } from "@/lib/db/schema/players";

// Idempotent persistence of one delivery payload. Used by the CV webhook and
// the image pipeline. Looks up or creates the innings/over/players based on
// the payload, then upserts on (overId, ballInOver) per AGENTS.md.

async function findOrCreatePlayer(
  matchId: string,
  name: string | null
): Promise<string | null> {
  if (!name) {
    return null;
  }
  const [existing] = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.matchId, matchId), eq(players.name, name)))
    .limit(1);
  if (existing) {
    return existing.id;
  }
  const [created] = await db
    .insert(players)
    .values({ matchId, name })
    .returning({ id: players.id });
  return created?.id ?? null;
}

async function findOrCreateInnings(matchId: string): Promise<string> {
  const [existing] = await db
    .select({ id: innings.id })
    .from(innings)
    .where(and(eq(innings.matchId, matchId), eq(innings.number, 1)))
    .limit(1);
  if (existing) {
    return existing.id;
  }
  const [created] = await db
    .insert(innings)
    .values({ matchId, number: 1 })
    .returning({ id: innings.id });
  if (!created) {
    throw new Error("Failed to create innings");
  }
  return created.id;
}

async function findOrCreateOver(
  inningsId: string,
  number: number,
  bowlerId: string | null
): Promise<string> {
  const [existing] = await db
    .select({ id: overs.id })
    .from(overs)
    .where(and(eq(overs.inningsId, inningsId), eq(overs.number, number)))
    .limit(1);
  if (existing) {
    return existing.id;
  }
  const [created] = await db
    .insert(overs)
    .values({ inningsId, number, bowlerId })
    .returning({ id: overs.id });
  if (!created) {
    throw new Error("Failed to create over");
  }
  return created.id;
}

export type PersistResult = {
  deliveryId: string;
  isNew: boolean;
};

export async function persistDelivery(
  payload: DeliveryPayload
): Promise<PersistResult> {
  const inningsId = await findOrCreateInnings(payload.matchId);
  const bowlerId = await findOrCreatePlayer(
    payload.matchId,
    payload.bowlerName
  );
  const batsmanId = await findOrCreatePlayer(
    payload.matchId,
    payload.batsmanName
  );
  const nonStrikerId = await findOrCreatePlayer(
    payload.matchId,
    payload.nonStrikerName
  );
  const fielderId = await findOrCreatePlayer(
    payload.matchId,
    payload.fielderName
  );
  const overId = await findOrCreateOver(
    inningsId,
    payload.overNumber,
    bowlerId
  );

  const [row] = await db
    .insert(deliveries)
    .values({
      overId,
      ballInOver: payload.ballInOver,
      videoStartMs: payload.videoStartMs,
      videoEndMs: payload.videoEndMs,
      clipBlobUrl: payload.clipBlobUrl,
      ballType: payload.ballType,
      line: payload.line,
      lengthMeters:
        payload.lengthMeters === null ? null : payload.lengthMeters.toString(),
      speedKmh: payload.speedKmh === null ? null : payload.speedKmh.toString(),
      swing: payload.swing,
      spin: payload.spin,
      bowlerId,
      batsmanId,
      nonStrikerId,
      shotType: payload.shotType,
      shotFootwork: payload.shotFootwork,
      shotTiming: payload.shotTiming,
      shotDirectionDeg:
        payload.shotDirectionDeg === null
          ? null
          : payload.shotDirectionDeg.toString(),
      contactZone: payload.contactZone,
      runs: payload.runs,
      isBoundary: payload.isBoundary,
      isSix: payload.isSix,
      isWicket: payload.isWicket,
      dismissalType: payload.dismissalType,
      fielderId,
      trajectory: payload.trajectory as Trajectory | null,
      pitchPoint: payload.pitchPoint as PitchPoint | null,
      impactPoint: payload.impactPoint as ImpactPoint | null,
      endPoint: payload.endPoint as EndPoint | null,
      endTerminator: payload.endPoint?.terminator ?? null,
      confidence: payload.confidence,
      commentary: payload.commentary,
      debugJsonb: (payload.debug ?? {}) as DebugBlob,
      isImageOnly: payload.isImageOnly,
    })
    .onConflictDoUpdate({
      target: [deliveries.overId, deliveries.ballInOver],
      set: {
        ballType: payload.ballType,
        line: payload.line,
        lengthMeters:
          payload.lengthMeters === null
            ? null
            : payload.lengthMeters.toString(),
        speedKmh:
          payload.speedKmh === null ? null : payload.speedKmh.toString(),
        swing: payload.swing,
        spin: payload.spin,
        shotType: payload.shotType,
        shotFootwork: payload.shotFootwork,
        shotTiming: payload.shotTiming,
        shotDirectionDeg:
          payload.shotDirectionDeg === null
            ? null
            : payload.shotDirectionDeg.toString(),
        contactZone: payload.contactZone,
        runs: payload.runs,
        isBoundary: payload.isBoundary,
        isSix: payload.isSix,
        isWicket: payload.isWicket,
        dismissalType: payload.dismissalType,
        trajectory: payload.trajectory as Trajectory | null,
        pitchPoint: payload.pitchPoint as PitchPoint | null,
        impactPoint: payload.impactPoint as ImpactPoint | null,
        endPoint: payload.endPoint as EndPoint | null,
        endTerminator: payload.endPoint?.terminator ?? null,
        confidence: payload.confidence,
        commentary: payload.commentary,
        debugJsonb: (payload.debug ?? {}) as DebugBlob,
      },
    })
    .returning({ id: deliveries.id });

  // Bump match.updatedAt so the dashboard reorders.
  await db
    .update(matches)
    .set({ updatedAt: new Date() })
    .where(eq(matches.id, payload.matchId));

  return { deliveryId: row?.id ?? "", isNew: true };
}
