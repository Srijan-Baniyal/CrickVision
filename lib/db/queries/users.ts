import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";

function isPostgresUniqueViolation(err: unknown): boolean {
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  ) {
    return true;
  }
  if (err && typeof err === "object" && "cause" in err && err.cause) {
    return isPostgresUniqueViolation(err.cause);
  }
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("duplicate key value") ||
    message.includes("unique constraint")
  );
}

/** Ensures a row exists for this Clerk user so FKs from `matches`, etc. succeed. */
export async function ensureClerkUser(args: {
  userId: string;
  email: string | null;
}): Promise<void> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, args.userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({ email: args.email })
      .where(eq(users.id, args.userId));
    return;
  }

  try {
    await db.insert(users).values({
      id: args.userId,
      email: args.email,
    });
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) {
      throw err;
    }
    await db
      .update(users)
      .set({ email: args.email })
      .where(eq(users.id, args.userId));
  }
}
