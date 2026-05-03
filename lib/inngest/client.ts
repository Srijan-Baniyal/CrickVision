import { Inngest } from "inngest";
import { env } from "@/env";

// One Inngest client per app. Event types are declared in lib/inngest/events.ts
// and imported alongside this client where needed. `eventKey` is explicit so we
// always use the same value as `env` validation (avoids typos / wrong var name).
export const inngest = new Inngest({
  id: "cricket-vision",
  eventKey: env.INNGEST_EVENT_KEY,
});

export type AppInngest = typeof inngest;
