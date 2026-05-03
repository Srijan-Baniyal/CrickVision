import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const PLACEHOLDER = "set-me-in-.env.local" as const;

const isPlaceholder = (val: string | undefined): boolean =>
  !val || val.startsWith(PLACEHOLDER);

const requiredString = (name: string) =>
  z
    .string()
    .min(1, `${name} is required`)
    .refine(
      (val) => !isPlaceholder(val),
      `${name} is set to a placeholder; configure it in .env.local`
    );

const optionalUrl = z.string().url().optional().or(z.literal(""));

export const env = createEnv({
  server: {
    DATABASE_URL: requiredString("DATABASE_URL"),

    BLOB_READ_WRITE_TOKEN: requiredString("BLOB_READ_WRITE_TOKEN"),

    INNGEST_EVENT_KEY: requiredString("INNGEST_EVENT_KEY"),
    INNGEST_SIGNING_KEY: requiredString("INNGEST_SIGNING_KEY"),
    INNGEST_DEV: z
      .enum(["0", "1"])
      .optional()
      .transform((v) => v === "1"),

    CLERK_SECRET_KEY: requiredString("CLERK_SECRET_KEY"),

    CV_SERVICE_URL: requiredString("CV_SERVICE_URL"),
    CV_SERVICE_TOKEN: requiredString("CV_SERVICE_TOKEN"),
    CV_WEBHOOK_HMAC_SECRET: requiredString("CV_WEBHOOK_HMAC_SECRET"),

    GEMINI_API_KEY: requiredString("GEMINI_API_KEY"),

    // Optional: https://console.upstash.com — persisted counters for rate limits
    // (token bucket + sliding window). If unset, limits are skipped (dev / fail-open).
    UPSTASH_REDIS_REST_URL: optionalUrl,
    UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal("")),

    APP_URL: optionalUrl,

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requiredString(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
    ),
    NEXT_PUBLIC_APP_URL: optionalUrl,
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  skipValidation:
    process.env.SKIP_ENV_VALIDATION === "1" ||
    process.env.npm_lifecycle_event === "lint" ||
    process.env.npm_lifecycle_event === "format",

  emptyStringAsUndefined: true,
});

export const isPlaceholderEnv = (): boolean =>
  isPlaceholder(process.env.DATABASE_URL) ||
  isPlaceholder(process.env.CLERK_SECRET_KEY);
