import { eventType, staticSchema } from "inngest";

// Decentralized event types per Inngest v4. Each event is a value used at the
// trigger site, in step.waitForEvent, and in inngest.send (for typed sends).
// Runtime validation of the CV webhook payload is handled by lib/cv/schema.ts;
// these are compile-time only via staticSchema.
// Inngest `staticSchema` requires `Record<string, unknown>` — intersect so structs qualify.

export type VideoUploadedData = {
  matchId: string;
  userId: string;
  videoId: string;
} & Record<string, unknown>;
export const videoUploaded = eventType("match/video.uploaded", {
  schema: staticSchema<VideoUploadedData>(),
});

export type VideoUrlRequestedData = {
  matchId: string;
  url: string;
  userId: string;
} & Record<string, unknown>;
export const videoUrlRequested = eventType("match/video.url.requested", {
  schema: staticSchema<VideoUrlRequestedData>(),
});

export type ImageUploadedData = {
  matchId: string;
  userId: string;
  videoId: string;
} & Record<string, unknown>;
export const imageUploaded = eventType("match/image.uploaded", {
  schema: staticSchema<ImageUploadedData>(),
});

export type CvDeliveryExtractedData = {
  delivery: unknown;
  jobId: string;
  matchId: string;
} & Record<string, unknown>;
export const cvDeliveryExtracted = eventType("cv/delivery.extracted", {
  schema: staticSchema<CvDeliveryExtractedData>(),
});

export type CvJobCompletedData = {
  jobId: string;
  matchId: string;
  totalDeliveries: number;
} & Record<string, unknown>;
export const cvJobCompleted = eventType("cv/job.completed", {
  schema: staticSchema<CvJobCompletedData>(),
});

export type CvJobFailedData = {
  error: { message: string; stack?: string };
  jobId: string;
  matchId: string;
} & Record<string, unknown>;
export const cvJobFailed = eventType("cv/job.failed", {
  schema: staticSchema<CvJobFailedData>(),
});

export type DeliveryPersistedData = {
  deliveryId: string;
  matchId: string;
} & Record<string, unknown>;
export const deliveryPersisted = eventType("match/delivery.persisted", {
  schema: staticSchema<DeliveryPersistedData>(),
});

export type MatchReadyData = {
  matchId: string;
} & Record<string, unknown>;
export const matchReady = eventType("match/ready", {
  schema: staticSchema<MatchReadyData>(),
});
