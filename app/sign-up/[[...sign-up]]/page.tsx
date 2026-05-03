import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function SignUpFallback() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Skeleton className="mx-auto h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Suspense fallback={<SignUpFallback />}>
        <SignUp />
      </Suspense>
    </main>
  );
}
