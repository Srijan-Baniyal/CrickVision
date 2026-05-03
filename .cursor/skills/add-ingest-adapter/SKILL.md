---
name: add-ingest-adapter
description: Pattern for adding a new ingest source (live RTMP/HLS, phone-camera PWA, Mux webhook, S3 dropbox, etc.) to the cricket-vision-analytics project. Use when the user asks to support a new way of getting cricket footage into the system. Adapters normalize every source into the same downstream event so the CV pipeline never changes.
---

# Add an Ingest Adapter

The whole system runs on one event: `match/video.uploaded`. Adapters convert *anything* — a 100 MB browser upload, a YouTube link, an RTMP push, a phone camera stream — into that single event with a Vercel-Blob-hosted media URL. **The Inngest functions and CV service should not be touched** when adding an ingest source.

## The contract

Every adapter exports:

```typescript
// lib/ingest/<source>.ts
export interface IngestInput { /* source-specific */ }

export async function ingest(input: IngestInput): Promise<{
  matchId: string;
  mediaUrl: string;       // Vercel Blob URL
  kind: "video" | "image";
  sourceKind: "upload" | "url" | "image" | "live" | "pwa" | string;
  sourceRef?: string;     // user-pasted URL, livestream id, etc., for audit
}>;
```

The Server Action calling this MUST:
1. Authenticate via `lib/auth.ts`.
2. Insert a `matches` row with `status: "uploading"` BEFORE bytes start flowing.
3. Once the Blob URL is known, insert the `videos` row.
4. Fire `inngest.send({ name: "match/video.uploaded", data: { matchId } })`.
5. Set `match.status = "processing"`.

## Checklist

```
- [ ] 1. Decide: synchronous (Server Action does it all) or async (Inngest function downloads/streams)?
- [ ] 2. Create lib/ingest/<source>.ts implementing the IngestAdapter contract
- [ ] 3. If async: add a sister Inngest function in lib/inngest/functions/
- [ ] 4. Add a tab/route in app/(app)/matches/new/page.tsx (or a dedicated page)
- [ ] 5. Add the new sourceKind value to lib/db/schema/matches.ts enum + run migration
- [ ] 6. Add a row to the AGENTS.md "ingest adapters" doc (if introducing a new sourceKind)
- [ ] 7. Test: hit it with a small fixture and watch the SSE stream produce deliveries
```

## Synchronous vs async

- **Synchronous** (file upload, image upload): bytes arrive in the request; the Server Action can fire the event before returning. Use this when the upload completes within the Server Action timeout (~10s on Vercel; long PUTs to Blob count against this).
- **Async** (URL paste, live RTMP, phone PWA chunks): bytes don't fully exist yet when the user submits. The Server Action just records intent and fires `match/video.<source>.requested`. A separate Inngest function does the actual download/segment-pull, uploads to Blob, and fires `match/video.uploaded`.

Pattern for async (URL example):

```typescript
// lib/inngest/functions/download-url.ts
export const downloadUrl = inngest.createFunction(
  { id: "download-url" },
  { event: "match/video.url.requested" },
  async ({ event, step }) => {
    const blobUrl = await step.run("yt-dlp", () =>
      cvClient.download({ url: event.data.url, matchId: event.data.matchId })
    );
    await step.run("save-video-row", () => db.insert(videos).values({ ... }));
    await step.sendEvent("emit-uploaded", {
      name: "match/video.uploaded",
      data: { matchId: event.data.matchId },
    });
  },
);
```

Note `cvClient.download` calls Modal because `yt-dlp` lives in the CV container.

## Live streams (special case)

For RTMP/HLS ingest (e.g., Mux Live):
- Don't fire `match/video.uploaded` per-segment. Fire it once when the stream starts.
- Add a separate event `match/segment.received` for each HLS segment. The CV service exposes `POST /v1/jobs/{id}/segments` to append.
- The CV `pipeline/segment.py` switches to a sliding-window mode for live jobs (configured by `state.is_live = True`).

This is a non-trivial extension; see the live ingest design note in `docs/ingest-live.md` (TBD; create when the user asks for live).

## Anti-patterns

- ❌ Bypassing the `match/video.uploaded` event and calling the CV service directly from the Server Action. You lose retries, observability, and the SSE update stream.
- ❌ Uploading to a different blob store. `lib/storage.ts` is the only path. Add support for new providers there, not in adapters.
- ❌ Different `sourceKind` strings in the DB vs the UI vs the analytics queries. Stick the literal string in one constants file (`lib/ingest/types.ts`) and import everywhere.
