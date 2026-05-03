import { eq } from "drizzle-orm";
import { env } from "@/env";
import { cvClient } from "@/lib/cv/client";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema/matches";
import { processingJobs } from "@/lib/db/schema/processingJobs";
import { videos } from "@/lib/db/schema/videos";
import { inngest } from "../client";
import { cvJobCompleted, videoUploaded } from "../events";

export const processMatch = inngest.createFunction(
  {
    id: "process-match",
    name: "Process match video",
    retries: 3,
    triggers: [videoUploaded],
  },
  async ({ event, step }) => {
    const { matchId, videoId, userId } = event.data;

    await step.run("init-job", async () => {
      await db.insert(processingJobs).values({
        matchId,
        inngestRunId: event.id ?? null,
        status: "running",
        currentStep: "validate-video",
        startedAt: new Date(),
      });
    });

    const blobUrl = await step.run("fetch-video-url", async () => {
      const [v] = await db
        .select({ url: videos.blobUrl })
        .from(videos)
        .where(eq(videos.id, videoId))
        .limit(1);
      if (!v) {
        throw new Error(`video ${videoId} not found`);
      }
      return v.url;
    });

    const { jobId } = await step.run("start-cv-job", async () => {
      const callbackUrl = `${env.APP_URL ?? "http://localhost:3000"}/api/cv/webhook`;
      const result = await cvClient.startJob({
        matchId,
        videoUrl: blobUrl,
        callbackUrl,
        hmacSecret: env.CV_WEBHOOK_HMAC_SECRET,
      });
      await db
        .update(processingJobs)
        .set({ cvJobId: result.jobId, currentStep: "wait-for-deliveries" })
        .where(eq(processingJobs.matchId, matchId));
      return result;
    });

    // Wait until the CV service emits cv/job.completed. Each delivery
    // arrives via the webhook → handleDelivery persists it independently.
    const completed = await step.waitForEvent("await-completion", {
      event: cvJobCompleted,
      timeout: "2h",
      if: `event.data.matchId == "${matchId}" && event.data.jobId == "${jobId}"`,
    });

    await step.run("mark-ready", async () => {
      await db
        .update(matches)
        .set({ status: "ready", updatedAt: new Date() })
        .where(eq(matches.id, matchId));
      await db
        .update(processingJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
          deliveriesExtracted: completed?.data.totalDeliveries ?? 0,
          currentStep: "done",
        })
        .where(eq(processingJobs.matchId, matchId));
    });

    return {
      matchId,
      userId,
      totalDeliveries: completed?.data.totalDeliveries ?? 0,
    };
  }
);
