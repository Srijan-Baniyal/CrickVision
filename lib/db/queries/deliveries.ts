import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { type Delivery, deliveries } from "@/lib/db/schema/deliveries";
import { innings } from "@/lib/db/schema/innings";
import { overs } from "@/lib/db/schema/overs";
import { type Player, players } from "@/lib/db/schema/players";

const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch {
    return fallback;
  }
};

export type DeliveryRow = Delivery & {
  overNumber: number;
  inningsNumber: number;
  bowlerName: string | null;
  batsmanName: string | null;
};

export function listDeliveriesForMatch(
  matchId: string
): Promise<DeliveryRow[]> {
  return safe(async () => {
    const bowlerAlias = players;
    const batsmanAlias = players;
    const rows = await db
      .select({
        delivery: deliveries,
        overNumber: overs.number,
        inningsNumber: innings.number,
        bowlerName: bowlerAlias.name,
        batsmanName: batsmanAlias.name,
      })
      .from(deliveries)
      .innerJoin(overs, eq(overs.id, deliveries.overId))
      .innerJoin(innings, eq(innings.id, overs.inningsId))
      .leftJoin(bowlerAlias, eq(bowlerAlias.id, deliveries.bowlerId))
      .leftJoin(batsmanAlias, eq(batsmanAlias.id, deliveries.batsmanId))
      .where(eq(innings.matchId, matchId))
      .orderBy(
        asc(innings.number),
        asc(overs.number),
        asc(deliveries.ballInOver)
      );
    return rows.map((r) => ({
      ...r.delivery,
      overNumber: r.overNumber,
      inningsNumber: r.inningsNumber,
      bowlerName: r.bowlerName,
      batsmanName: r.batsmanName,
    }));
  }, []);
}

export function getDeliveryById(deliveryId: string): Promise<
  | (Delivery & {
      overNumber: number;
      inningsNumber: number;
      matchId: string;
      bowler: Player | null;
      batsman: Player | null;
    })
  | null
> {
  return safe(async () => {
    const bowlerAlias = players;
    const batsmanAlias = players;
    const [row] = await db
      .select({
        delivery: deliveries,
        overNumber: overs.number,
        inningsNumber: innings.number,
        matchId: innings.matchId,
        bowler: bowlerAlias,
        batsman: batsmanAlias,
      })
      .from(deliveries)
      .innerJoin(overs, eq(overs.id, deliveries.overId))
      .innerJoin(innings, eq(innings.id, overs.inningsId))
      .leftJoin(bowlerAlias, eq(bowlerAlias.id, deliveries.bowlerId))
      .leftJoin(batsmanAlias, eq(batsmanAlias.id, deliveries.batsmanId))
      .where(eq(deliveries.id, deliveryId))
      .limit(1);
    if (!row) {
      return null;
    }
    return {
      ...row.delivery,
      overNumber: row.overNumber,
      inningsNumber: row.inningsNumber,
      matchId: row.matchId,
      bowler: row.bowler,
      batsman: row.batsman,
    };
  }, null);
}
