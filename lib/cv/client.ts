import { z } from "zod";
import { env } from "@/env";
import type { DeliveryPayload } from "./schema";
import { deliverySchema } from "./schema";

// Typed HTTPS client for the Python CV service. The only file that knows the
// CV URL or token. See AGENTS.md "Service boundaries".

const startJobResponseSchema = z.object({
  jobId: z.string(),
  status: z.literal("queued"),
});

const downloadResponseSchema = z.object({
  blobUrl: z.string().url(),
  byteSize: z.number().int().nonnegative(),
  durationSec: z.number().nonnegative().optional(),
  widthPx: z.number().int().optional(),
  heightPx: z.number().int().optional(),
  fps: z.number().optional(),
});

const headers = (extra: Record<string, string> = {}) => ({
  "content-type": "application/json",
  authorization: `Bearer ${env.CV_SERVICE_TOKEN}`,
  ...extra,
});

const REQUEST_TIMEOUT_MS = 60_000;

async function fetchJson<T>(
  url: string,
  init: RequestInit,
  schema: z.ZodType<T>
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`CV service ${url} returned ${res.status}`);
    }
    const json = (await res.json()) as unknown;
    return schema.parse(json);
  } finally {
    clearTimeout(timer);
  }
}

export type StartJobArgs = {
  matchId: string;
  videoUrl: string;
  callbackUrl: string;
  hmacSecret: string;
};

export const cvClient = {
  startJob: (args: StartJobArgs) =>
    fetchJson(
      `${env.CV_SERVICE_URL}/v1/jobs`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(args),
      },
      startJobResponseSchema
    ),

  downloadUrl: (args: { url: string; matchId: string }) =>
    fetchJson(
      `${env.CV_SERVICE_URL}/v1/downloads`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(args),
      },
      downloadResponseSchema
    ),

  processImage: (args: {
    matchId: string;
    imageUrl: string;
    callbackUrl: string;
    hmacSecret: string;
  }): Promise<DeliveryPayload> =>
    fetchJson(
      `${env.CV_SERVICE_URL}/v1/images`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(args),
      },
      deliverySchema
    ),
};

export type CvClient = typeof cvClient;
