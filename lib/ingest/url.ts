import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema/matches";
import { inngest } from "@/lib/inngest/client";
import { videoUrlRequested } from "@/lib/inngest/events";
import { rateLimitIngest } from "@/lib/rate-limit";
import type { IngestActionResult } from "./types";

export type UrlIngestInput = {
  title: string;
  url: string;
  format: "T20" | "ODI" | "Test" | "Highlights";
};

const urlSchema = z.string().url().max(2048);

export async function ingestUrl(
  input: UrlIngestInput
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
  const parsed = urlSchema.safeParse(input.url.trim());
  if (!parsed.success) {
    return { ok: false, error: { code: "VALIDATION", message: "Invalid URL" } };
  }

  // The Modal CV service downloads the URL via yt-dlp. We just record intent
  // and enqueue. See lib/inngest/functions/download-url.ts.
  const [match] = await db
    .insert(matches)
    .values({
      userId: session.userId,
      title: input.title.trim(),
      format: input.format,
      sourceKind: "url",
      sourceRef: parsed.data,
      status: "processing",
    })
    .returning();

  if (!match) {
    return {
      ok: false,
      error: { code: "DB_FAILED", message: "Failed to insert match" },
    };
  }

  await inngest.send({
    ...videoUrlRequested.create({
      matchId: match.id,
      url: parsed.data,
      userId: session.userId,
    }),
  });

  return {
    ok: true,
    result: {
      matchId: match.id,
      mediaUrl: parsed.data, // pre-download; the real Blob URL appears later
      kind: "video",
      sourceKind: "url",
      sourceRef: parsed.data,
    },
  };
}
