// Shared types for every ingest adapter. New sources (live RTMP, PWA capture,
// S3 dropbox, …) implement IngestAdapter, normalize their input, and emit the
// downstream Inngest event without touching the rest of the system. See the
// .cursor/skills/add-ingest-adapter skill.

export type IngestKind = "video" | "image";

export type IngestSourceKind = "upload" | "url" | "image" | "live" | "pwa";

export type IngestResult = {
  matchId: string;
  mediaUrl: string;
  kind: IngestKind;
  sourceKind: IngestSourceKind;
  sourceRef?: string | null;
};

export type IngestError = {
  code:
    | "UNAUTHORIZED"
    | "VALIDATION"
    | "STORAGE_FAILED"
    | "DB_FAILED"
    | "ENQUEUE_FAILED"
    | "RATE_LIMIT"
    | "UNKNOWN";
  message: string;
};

export type IngestActionResult =
  | { ok: true; result: IngestResult }
  | { ok: false; error: IngestError };

const VIDEO_MIME_PREFIX = "video/";
const IMAGE_MIME_PREFIX = "image/";
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB cap (locked plan decision).
const MAX_IMAGE_BYTES = 25 * 1024 * 1024; //  25 MB cap.

export const INGEST_LIMITS = {
  maxVideoBytes: MAX_VIDEO_BYTES,
  maxImageBytes: MAX_IMAGE_BYTES,
  videoMimePrefix: VIDEO_MIME_PREFIX,
  imageMimePrefix: IMAGE_MIME_PREFIX,
} as const;
