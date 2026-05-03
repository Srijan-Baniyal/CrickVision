import { eq } from "drizzle-orm";
import { isCvServiceConfigured } from "@/env";
import { cvClient } from "@/lib/cv/client";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema/matches";
import { videos } from "@/lib/db/schema/videos";
import { inngest } from "../client";
import { videoUploaded, videoUrlRequested } from "../events";
import { failMatchMissingCv } from "../failMissingCv";

export const downloadUrl = inngest.createFunction(
  {
    id: "download-url",
    name: "Download video from URL",
    retries: 2,
    triggers: [videoUrlRequested],
  },
  async ({ event, step }) => {
    const { matchId, url, userId } = event.data;

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
      return { matchId, userId, aborted: true as const };
    }

    const downloaded = await step.run("yt-dlp", async () =>
      cvClient.downloadUrl({ url, matchId })
    );

    const videoId = await step.run("save-video-row", async () => {
      const [v] = await db
        .insert(videos)
        .values({
          matchId,
          blobUrl: downloaded.blobUrl,
          byteSize: downloaded.byteSize,
          durationSec:
            downloaded.durationSec === undefined
              ? null
              : downloaded.durationSec.toString(),
          widthPx: downloaded.widthPx ?? null,
          heightPx: downloaded.heightPx ?? null,
          fps: downloaded.fps === undefined ? null : downloaded.fps.toString(),
        })
        .returning({ id: videos.id });
      if (!v) {
        throw new Error("failed to insert video row after download");
      }
      await db
        .update(matches)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(matches.id, matchId));
      return v.id;
    });

    await step.sendEvent("emit-uploaded", {
      ...videoUploaded.create({ matchId, videoId, userId }),
    });

    return { matchId, videoId };
  }
);
