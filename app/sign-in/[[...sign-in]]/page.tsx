import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function SignInFallback() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Skeleton className="mx-auto h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Suspense fallback={<SignInFallback />}>
        <SignIn />
      </Suspense>
    </main>
  );
}
