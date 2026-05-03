import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { cvWebhookPayloadSchema } from "@/lib/cv/schema";
import { inngest } from "@/lib/inngest/client";
import {
  cvDeliveryExtracted,
  cvJobCompleted,
  cvJobFailed,
} from "@/lib/inngest/events";

const SIGNATURE_HEADER = "x-cv-signature";

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) {
    return false;
  }
  const computed = createHmac("sha256", env.CV_WEBHOOK_HMAC_SECRET)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function POST(req: Request): Promise<NextResponse> {
  const rawBody = await req.text();
  const sig = req.headers.get(SIGNATURE_HEADER);

  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const result = cvWebhookPayloadSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: result.error.issues },
      { status: 422 }
    );
  }

  const event = result.data;

  switch (event.type) {
    case "cv/delivery.extracted":
      await inngest.send({
        ...cvDeliveryExtracted.create({
          matchId: event.delivery.matchId,
          jobId: event.jobId,
          delivery: event.delivery,
        }),
      });
      break;
    case "cv/job.completed":
      await inngest.send({
        ...cvJobCompleted.create({
          matchId: event.matchId,
          jobId: event.jobId,
          totalDeliveries: event.totalDeliveries,
        }),
      });
      break;
    case "cv/job.failed":
      await inngest.send({
        ...cvJobFailed.create({
          matchId: event.matchId,
          jobId: event.jobId,
          error: event.error,
        }),
      });
      break;
    default: {
      const _exhaustive: never = event;
      throw new Error(
        `Unhandled CV webhook event: ${JSON.stringify(_exhaustive)}`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
