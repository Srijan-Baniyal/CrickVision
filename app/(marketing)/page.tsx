import { auth } from "@clerk/nextjs/server";
import {
  ArrowRightIcon,
  BroadcastIcon,
  ChartBarIcon,
  CrosshairIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: CrosshairIcon,
    title: "Per-delivery detection",
    body: "Ball type, line, length, speed, swing, and spin — extracted automatically from raw video.",
  },
  {
    icon: BroadcastIcon,
    title: "Phased ball tracking",
    body: "Trajectory continues past bat-ball contact. We capture where it pitched, where it was hit, and where it ended.",
  },
  {
    icon: ChartBarIcon,
    title: "Structured analytics",
    body: "Wagon wheels, pitch maps, heat maps, shot selection patterns, and over-by-over breakdowns — out of the box.",
  },
] as const;

export default async function MarketingHome() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div aria-hidden className="size-7 rounded-md bg-primary" />
            <span className="font-semibold tracking-tight">Cricket Vision</span>
          </div>
          <nav className="flex items-center gap-3">
            {isSignedIn ? (
              <Button asChild size="sm">
                <Link href="/dashboard">
                  Dashboard
                  <ArrowRightIcon className="ml-1 size-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-start gap-8 px-6 py-20">
        <Badge className="rounded-full" variant="secondary">
          Hybrid CV + Vision LLM · Powered by YOLOv11 + Gemini
        </Badge>
        <h1 className="max-w-3xl text-balance font-semibold text-5xl leading-tight tracking-tight">
          Granular cricket analytics from any video — automatically.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Upload a clip, paste a URL, or drop in a single image. We classify
          every delivery, track the ball through impact, and generate the
          structured analytics broadcast tools cost a fortune for.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {isSignedIn ? (
            <Button asChild size="lg">
              <Link href="/matches/new">
                Analyze a match
                <ArrowRightIcon className="ml-1 size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/sign-up">
                Try it free
                <ArrowRightIcon className="ml-1 size-4" />
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">View dashboard</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <article
            className="rounded-lg border border-border bg-card p-6"
            key={feature.title}
          >
            <feature.icon
              aria-hidden
              className="size-6 text-primary"
              weight="duotone"
            />
            <h3 className="mt-4 font-semibold text-lg">{feature.title}</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
              {feature.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="border-border border-t">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-muted-foreground text-xs">
          <span>Cricket Vision Analytics · v0</span>
          <Link className="hover:text-foreground" href="/dashboard">
            Open the app →
          </Link>
        </div>
      </footer>
    </main>
  );
}
