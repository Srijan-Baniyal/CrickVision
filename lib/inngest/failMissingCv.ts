import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema/matches";
import { processingJobs } from "@/lib/db/schema/processingJobs";

export const MISSING_CV_MESSAGE =
  "CV service is not configured. Set CV_SERVICE_URL, CV_SERVICE_TOKEN, and CV_WEBHOOK_HMAC_SECRET in .env.local to your real Modal endpoint and secrets (values must not start with set-me-in-.env.local).";

/** Marks match failed and records a processing row so the UI / SSE can exit "processing". */
export async function failMatchMissingCv(args: {
  matchId: string;
  inngestEventId: string | undefined;
}): Promise<void> {
  await db
    .update(matches)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(matches.id, args.matchId));

  await db.insert(processingJobs).values({
    matchId: args.matchId,
    inngestRunId: args.inngestEventId ?? null,
    status: "failed",
    currentStep: "cv-not-configured",
    errorJson: { message: MISSING_CV_MESSAGE },
    completedAt: new Date(),
    startedAt: new Date(),
  });
}
