import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that require sign-in. Everything else (marketing, /sign-in, /sign-up,
// public webhooks under /api/cv/webhook, /api/inngest) is public.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/matches(.*)",
  "/api/uploads(.*)",
  "/api/matches(.*)/stream",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
