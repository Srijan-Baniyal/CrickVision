"use client";

import { useUser } from "@clerk/nextjs";

export function AppHeaderEmail() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) {
    return (
      <span aria-hidden className="text-muted-foreground text-xs">
        …
      </span>
    );
  }
  const email = user?.primaryEmailAddress?.emailAddress;
  return (
    <span className="text-muted-foreground text-xs">
      {email ?? "Signed in"}
    </span>
  );
}
