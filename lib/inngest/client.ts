import { Inngest } from "inngest";

// One Inngest client per app. Event types are declared in lib/inngest/events.ts
// and imported alongside this client where needed.
export const inngest = new Inngest({ id: "cricket-vision" });

export type AppInngest = typeof inngest;
