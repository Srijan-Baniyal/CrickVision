import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema/matches";
import { processingJobs } from "@/lib/db/schema/processingJobs";
import { rateLimitHeaders, rateLimitSse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 15_000;

interface PollState {
  lastCount: number;
  lastStatus: string | null;
}

async function matchStreamPollTick(args: {
  matchId: string;
  state: PollState;
  send: (event: string, data: unknown) => void;
}): Promise<"continue" | "close"> {
  const { matchId, state, send } = args;

  const [job] = await db
    .select({
      status: processingJobs.status,
      count: processingJobs.deliveriesExtracted,
    })
    .from(processingJobs)
    .where(eq(processingJobs.matchId, matchId))
    .orderBy(processingJobs.createdAt)
    .limit(1);

  const [m] = await db
    .select({ status: matches.status })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);

  if (job && job.count !== state.lastCount) {
    send("delivery", { count: job.count });
    state.lastCount = job.count;
  }

  if (!m || m.status === state.lastStatus) {
    return "continue";
  }
  state.lastStatus = m.status;

  if (m.status === "ready") {
    send("ready", { matchId });
    return "close";
  }
  if (m.status === "failed") {
    send("failed", { matchId });
    return "close";
  }
  return "continue";
}

// SSE proxy. Polls the DB on a short interval and emits incremental events.
// In production this should subscribe to Inngest realtime; polling is the
// pragmatic v1 that needs no extra infra.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const session = await requireSession();

  const sseRl = await rateLimitSse(session.userId);
  if (!sseRl.ok) {
    return new Response("Too many stream connections. Try again shortly.", {
      status: 429,
      headers: rateLimitHeaders(sseRl),
    });
  }

  // Authorization gate — only the owner can stream a match's events.
  const [match] = await db
    .select({ userId: matches.userId, status: matches.status })
    .from(matches)
    .where(eq(matches.id, id))
    .limit(1);
  if (!match || match.userId !== session.userId) {
    return new Response("Not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const state: PollState = { lastCount: -1, lastStatus: null };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const heartbeat = setInterval(
        () => controller.enqueue(encoder.encode(": ping\n\n")),
        HEARTBEAT_INTERVAL_MS
      );

      const poll = setInterval(() => {
        matchStreamPollTick({ matchId: id, state, send })
          .then((action) => {
            if (action === "close") {
              clearInterval(poll);
              clearInterval(heartbeat);
              controller.close();
            }
          })
          .catch((err: unknown) => {
            send("error", {
              message: err instanceof Error ? err.message : "stream error",
            });
          });
      }, POLL_INTERVAL_MS);

      req.signal.addEventListener("abort", () => {
        clearInterval(poll);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
