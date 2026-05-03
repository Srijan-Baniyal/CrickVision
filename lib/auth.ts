import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureClerkUser } from "@/lib/db/queries/users";

// Thin wrapper so the rest of the app doesn't import @clerk directly.
// Swap this file (and middleware.ts) to change auth providers.
export interface AuthSession {
  email: string | null;
  userId: string;
}

/** Session from `auth()` only. Does not call `currentUser()` — that blocks App Router layouts. */
export async function getSession(): Promise<AuthSession | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  return {
    userId,
    email: null,
  };
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/** Use before inserts that FK to `users` (ingest, corrections). Avoid in layouts — DB work blocks streaming. */
export async function requireSessionForDbWrites(): Promise<AuthSession> {
  const session = await requireSession();
  const user = await currentUser();
  const withEmail: AuthSession = {
    userId: session.userId,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
  };
  await ensureClerkUser(withEmail);
  return withEmail;
}
