import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

/**
 * Rate limiting backed by Upstash Redis. Uses a **token bucket** for expensive
 * ingest (burst-friendly long-term cap) and **sliding windows** for smoothing
 * high-frequency endpoints — same algorithm families as
 * https://smudge.ai/blog/ratelimit-algorithms
 *
 * If `UPSTASH_REDIS_*` is unset, all checks succeed (local dev / fail-open on
 * missing config). Redis errors also fail open so the app stays available.
 */

let redisSingleton: Redis | null | undefined;
let redisUnavailableLogged = false;

function getRedis(): Redis | null {
  if (redisSingleton !== undefined) {
    return redisSingleton;
  }
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!(url && token)) {
    redisSingleton = null;
    if (
      env.NODE_ENV === "production" &&
      !redisUnavailableLogged &&
      process.env.CI !== "true"
    ) {
      redisUnavailableLogged = true;
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled"
      );
    }
    return null;
  }
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

type LimiterKey =
  | "ingest"
  | "uploadToken"
  | "sse"
  | "correctionsExport"
  | "correctionSubmit";

const limiterCache: Partial<Record<LimiterKey, Ratelimit>> = {};

function createLimiter(key: LimiterKey, redis: Redis): Ratelimit {
  switch (key) {
    case "ingest":
      return new Ratelimit({
        redis,
        limiter: Ratelimit.tokenBucket(5, "1 h", 15),
        prefix: "cricket:ingest",
        analytics: true,
      });
    case "uploadToken":
      return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(45, "1 m"),
        prefix: "cricket:blob-token",
        analytics: true,
      });
    case "sse":
      return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(24, "1 m"),
        prefix: "cricket:sse",
        analytics: true,
      });
    case "correctionsExport":
      return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(120, "1 m"),
        prefix: "cricket:corrections-export",
        analytics: true,
      });
    case "correctionSubmit":
      return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(40, "15 m"),
        prefix: "cricket:correction-submit",
        analytics: true,
      });
    default: {
      const _never: never = key;
      throw new Error(`Unhandled limiter key: ${String(_never)}`);
    }
  }
}

function getLimiter(key: LimiterKey): Ratelimit | null {
  const redis = getRedis();
  if (!redis) {
    return null;
  }
  const cached = limiterCache[key];
  if (cached) {
    return cached;
  }
  const limiter = createLimiter(key, redis);
  limiterCache[key] = limiter;
  return limiter;
}

export interface RateLimitDenied {
  limit: number;
  ok: false;
  remaining: number;
  reset: number;
}

export interface RateLimitOk {
  ok: true;
  skipped?: true;
}

export type RateLimitOutcome = RateLimitOk | RateLimitDenied;

async function consume(
  key: LimiterKey,
  identifier: string
): Promise<RateLimitOutcome> {
  const limiter = getLimiter(key);
  if (!limiter) {
    return { ok: true, skipped: true };
  }
  try {
    const result = await limiter.limit(identifier);
    await result.pending;
    if (!result.success) {
      return {
        ok: false,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[rate-limit] ${key} Redis error, fail open:`, err);
    return { ok: true, skipped: true };
  }
}

/** New match / analysis jobs (file, URL, image ingest). Token bucket per user. */
export function rateLimitIngest(userId: string): Promise<RateLimitOutcome> {
  return consume("ingest", userId);
}

/** Vercel Blob client-upload token handshake (multipart may call often). */
export function rateLimitUploadToken(
  userId: string
): Promise<RateLimitOutcome> {
  return consume("uploadToken", userId);
}

/** SSE polling endpoints per signed-in user. */
export function rateLimitSse(userId: string): Promise<RateLimitOutcome> {
  return consume("sse", userId);
}

/** Bearer-authenticated corrections export (Modal). Keyed by caller IP. */
export function rateLimitCorrectionsExport(
  ipKey: string
): Promise<RateLimitOutcome> {
  return consume("correctionsExport", `ip:${ipKey}`);
}

/** User corrections form submissions. */
export function rateLimitCorrectionSubmit(
  userId: string
): Promise<RateLimitOutcome> {
  return consume("correctionSubmit", userId);
}

export function rateLimitHeaders(
  denied: RateLimitDenied
): Record<string, string> {
  const retryAfter = Math.max(1, Math.ceil((denied.reset - Date.now()) / 1000));
  return {
    "X-RateLimit-Limit": String(denied.limit),
    "X-RateLimit-Remaining": String(denied.remaining),
    "X-RateLimit-Reset": String(denied.reset),
    "Retry-After": String(retryAfter),
  };
}

/** Thrown from route handlers that must return HTTP 429. */
export class HttpRateLimitError extends Error {
  readonly headers: Record<string, string>;

  constructor(message: string, denied: RateLimitDenied) {
    super(message);
    this.name = "HttpRateLimitError";
    this.headers = rateLimitHeaders(denied);
  }
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return "unknown";
}
