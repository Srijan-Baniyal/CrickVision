import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema/matches";
import { videos } from "@/lib/db/schema/videos";
import { inngest } from "@/lib/inngest/client";
import { imageUploaded } from "@/lib/inngest/events";
import { rateLimitIngest } from "@/lib/rate-limit";
import { putObject } from "@/lib/storage";
import { INGEST_LIMITS, type IngestActionResult } from "./types";

export type ImageIngestInput = {
  title: string;
  file: File;
};

const MAX = INGEST_LIMITS.maxImageBytes;
const PREFIX = INGEST_LIMITS.imageMimePrefix;

export async function ingestImage(
  input: ImageIngestInput
): Promise<IngestActionResult> {
  const session = await requireSession();

  const rl = await rateLimitIngest(session.userId);
  if (!rl.ok) {
    return {
      ok: false,
      error: {
        code: "RATE_LIMIT",
        message:
          "Too many analyses started. Wait a few minutes before starting another match.",
      },
    };
  }

  if (!input.title.trim()) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Title required" },
    };
  }
  if (!input.file.type.startsWith(PREFIX)) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Must be an image file" },
    };
  }
  if (input.file.size > MAX) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: `Image too large (max ${(MAX / 1024 / 1024).toFixed(0)} MB)`,
      },
    };
  }

  const [match] = await db
    .insert(matches)
    .values({
      userId: session.userId,
      title: input.title.trim(),
      format: "Image",
      sourceKind: "image",
      sourceRef: input.file.name,
      status: "uploading",
    })
    .returning();

  if (!match) {
    return {
      ok: false,
      error: { code: "DB_FAILED", message: "Failed to insert match" },
    };
  }

  const stored = await putObject({
    pathname: `matches/${match.id}/source/${input.file.name}`,
    contentType: input.file.type,
    body: input.file,
  });

  const [video] = await db
    .insert(videos)
    .values({
      matchId: match.id,
      blobUrl: stored.url,
      byteSize: stored.byteSize,
    })
    .returning();

  if (!video) {
    return {
      ok: false,
      error: { code: "DB_FAILED", message: "Failed to insert video" },
    };
  }

  await db
    .update(matches)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(matches.id, match.id));

  await inngest.send({
    ...imageUploaded.create({
      matchId: match.id,
      videoId: video.id,
      userId: session.userId,
    }),
  });

  return {
    ok: true,
    result: {
      matchId: match.id,
      mediaUrl: stored.url,
      kind: "image",
      sourceKind: "image",
      sourceRef: input.file.name,
    },
  };
}
