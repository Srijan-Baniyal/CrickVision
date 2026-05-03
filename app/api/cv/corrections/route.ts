import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { db } from "@/lib/db";
import { deliveries } from "@/lib/db/schema/deliveries";
import { deliveryCorrections } from "@/lib/db/schema/deliveryCorrections";
import {
  getClientIp,
  rateLimitCorrectionsExport,
  rateLimitHeaders,
} from "@/lib/rate-limit";

const querySchema = z.object({
  sinceHours: z.coerce.number().int().positive().max(720).default(24),
  limit: z.coerce.number().int().positive().max(5000).default(1000),
});

const MS_PER_HOUR = 3_600_000;

// Auth'd corrections export. Consumed by the nightly Modal job that ships a
// fine-tuning batch. Bearer = CV_SERVICE_TOKEN, same secret used by Next →
// CV calls but in reverse.
export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.CV_SERVICE_TOKEN}`) {
    return NextResponse.json(
      { ok: false, error: "Invalid token" },
      { status: 401 }
    );
  }

  const rl = await rateLimitCorrectionsExport(getClientIp(req));
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    sinceHours: url.searchParams.get("sinceHours"),
    limit: url.searchParams.get("limit"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid query" },
      { status: 400 }
    );
  }

  const since = new Date(Date.now() - parsed.data.sinceHours * MS_PER_HOUR);

  const rows = await db
    .select({
      correction: deliveryCorrections,
      ballType: deliveries.ballType,
      shotType: deliveries.shotType,
      commentary: deliveries.commentary,
      clipBlobUrl: deliveries.clipBlobUrl,
      pitchPoint: deliveries.pitchPoint,
      impactPoint: deliveries.impactPoint,
    })
    .from(deliveryCorrections)
    .innerJoin(deliveries, eq(deliveries.id, deliveryCorrections.deliveryId))
    .where(
      and(
        gte(deliveryCorrections.createdAt, since),
        sql`${deliveryCorrections.createdAt} <= now()`
      )
    )
    .orderBy(desc(deliveryCorrections.createdAt))
    .limit(parsed.data.limit);

  return NextResponse.json({
    ok: true,
    sinceHours: parsed.data.sinceHours,
    count: rows.length,
    corrections: rows.map((r) => ({
      id: r.correction.id,
      deliveryId: r.correction.deliveryId,
      fieldName: r.correction.fieldName,
      previousValue: r.correction.previousValue,
      correctedValue: r.correction.correctedValue,
      note: r.correction.note,
      createdAt: r.correction.createdAt,
      delivery: {
        ballType: r.ballType,
        shotType: r.shotType,
        commentary: r.commentary,
        clipBlobUrl: r.clipBlobUrl,
        pitchPoint: r.pitchPoint,
        impactPoint: r.impactPoint,
      },
    })),
  });
}
