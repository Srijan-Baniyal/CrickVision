import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deliveries } from "@/lib/db/schema/deliveries";
import { type Match, matches } from "@/lib/db/schema/matches";
import { overs } from "@/lib/db/schema/overs";
import { videos } from "@/lib/db/schema/videos";

const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // biome-ignore lint/suspicious/noConsole: dev-time hint when DB isn't wired yet
      console.warn(
        "[db] query failed (using fallback). Have you set DATABASE_URL in .env.local?",
        err instanceof Error ? err.message : err
      );
    }
    return fallback;
  }
};

export type MatchRow = Match & {
  videoUrl: string | null;
  deliveryCount: number;
};

export async function listMatchesForUser(userId: string): Promise<MatchRow[]> {
  return safe(async () => {
    const rows = await db
      .select({
        match: matches,
        videoUrl: videos.blobUrl,
      })
      .from(matches)
      .leftJoin(videos, eq(videos.matchId, matches.id))
      .where(eq(matches.userId, userId))
      .orderBy(desc(matches.createdAt))
      .limit(50);

    // Per-match delivery counts. One round-trip per match keeps the
    // fallback path simple; swap to a single LEFT JOIN + count when this
    // ever shows up in profiles.
    const enriched = await Promise.all(
      rows.map(async ({ match, videoUrl }) => {
        const counted = await db
          .select({ id: deliveries.id })
          .from(deliveries)
          .innerJoin(overs, eq(overs.id, deliveries.overId));
        return {
          ...match,
          videoUrl,
          deliveryCount: counted.length,
        };
      })
    );
    return enriched;
  }, []);
}

export async function getMatchById(
  matchId: string,
  userId: string
): Promise<MatchRow | null> {
  return safe(async () => {
    const [row] = await db
      .select({ match: matches, videoUrl: videos.blobUrl })
      .from(matches)
      .leftJoin(videos, eq(videos.matchId, matches.id))
      .where(eq(matches.id, matchId))
      .limit(1);
    if (!row || row.match.userId !== userId) {
      return null;
    }
    return { ...row.match, videoUrl: row.videoUrl, deliveryCount: 0 };
  }, null);
}
