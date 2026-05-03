import { auth, currentUser } from "@clerk/nextjs/server";

// Thin wrapper so the rest of the app doesn't import @clerk directly.
// Swap this file (and middleware.ts) to change auth providers.
export type AuthSession = {
  userId: string;
  email: string | null;
};

export async function getSession(): Promise<AuthSession | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const user = await currentUser();
  return {
    userId,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
  };
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
