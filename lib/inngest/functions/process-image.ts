import { eq } from "drizzle-orm";
import { env, getAppUrl, isCvServiceConfigured } from "@/env";
import { cvClient } from "@/lib/cv/client";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema/matches";
import { processingJobs } from "@/lib/db/schema/processingJobs";
import { videos } from "@/lib/db/schema/videos";
import { inngest } from "../client";
import { deliveryPersisted, imageUploaded } from "../events";
import { failMatchMissingCv } from "../failMissingCv";
import { persistDelivery } from "../persistDelivery";

export const processImage = inngest.createFunction(
  {
    id: "process-image",
    name: "Process single image",
    retries: 3,
    triggers: [imageUploaded],
  },
  async ({ event, step }) => {
    const { matchId, videoId } = event.data;

    const cvOk = await step.run("check-cv-config", async () =>
      isCvServiceConfigured()
    );
    if (!cvOk) {
      await step.run("abort-missing-cv", async () =>
        failMatchMissingCv({
          matchId,
          inngestEventId: event.id,
        })
      );
      return { matchId, aborted: true as const };
    }

    await step.run("init-job", async () => {
      await db.insert(processingJobs).values({
        matchId,
        inngestRunId: event.id ?? null,
        status: "running",
        currentStep: "process-image",
        startedAt: new Date(),
      });
    });

    const imageUrl = await step.run("fetch-image-url", async () => {
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

    const payload = await step.run("call-cv-image", async () =>
      cvClient.processImage({
        matchId,
        imageUrl,
        callbackUrl: `${getAppUrl()}/api/cv/webhook`,
        hmacSecret: env.CV_WEBHOOK_HMAC_SECRET,
      })
    );

    const { deliveryId } = await step.run("persist", async () =>
      persistDelivery({ ...payload, matchId, isImageOnly: true })
    );

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
          deliveriesExtracted: 1,
          currentStep: "done",
        })
        .where(eq(processingJobs.matchId, matchId));
    });

    await step.sendEvent("notify-ui", {
      ...deliveryPersisted.create({ matchId, deliveryId }),
    });

    return { matchId, deliveryId };
  }
);
