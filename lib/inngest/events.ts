import { eventType, staticSchema } from "inngest";

// Decentralized event types per Inngest v4. Each event is a value used at the
// trigger site, in step.waitForEvent, and in inngest.send (for typed sends).
// Runtime validation of the CV webhook payload is handled by lib/cv/schema.ts;
// these are compile-time only via staticSchema.

export type VideoUploadedData = {
  matchId: string;
  videoId: string;
  userId: string;
};
export const videoUploaded = eventType("match/video.uploaded", {
  schema: staticSchema<VideoUploadedData>(),
});

export type VideoUrlRequestedData = {
  matchId: string;
  url: string;
  userId: string;
};
export const videoUrlRequested = eventType("match/video.url.requested", {
  schema: staticSchema<VideoUrlRequestedData>(),
});

export type ImageUploadedData = {
  matchId: string;
  videoId: string;
  userId: string;
};
export const imageUploaded = eventType("match/image.uploaded", {
  schema: staticSchema<ImageUploadedData>(),
});

export type CvDeliveryExtractedData = {
  matchId: string;
  jobId: string;
  delivery: unknown;
};
export const cvDeliveryExtracted = eventType("cv/delivery.extracted", {
  schema: staticSchema<CvDeliveryExtractedData>(),
});

export type CvJobCompletedData = {
  matchId: string;
  jobId: string;
  totalDeliveries: number;
};
export const cvJobCompleted = eventType("cv/job.completed", {
  schema: staticSchema<CvJobCompletedData>(),
});

export type CvJobFailedData = {
  matchId: string;
  jobId: string;
  error: { message: string; stack?: string };
};
export const cvJobFailed = eventType("cv/job.failed", {
  schema: staticSchema<CvJobFailedData>(),
});

export type DeliveryPersistedData = {
  matchId: string;
  deliveryId: string;
};
export const deliveryPersisted = eventType("match/delivery.persisted", {
  schema: staticSchema<DeliveryPersistedData>(),
});

export type MatchReadyData = { matchId: string };
export const matchReady = eventType("match/ready", {
  schema: staticSchema<MatchReadyData>(),
});
