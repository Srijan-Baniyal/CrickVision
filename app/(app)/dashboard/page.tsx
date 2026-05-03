import { PlusCircleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { MatchCard } from "@/components/match/MatchCard";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireSession } from "@/lib/auth";
import { listMatchesForUser } from "@/lib/db/queries/matches";

export default async function DashboardPage() {
  const session = await requireSession();
  const matches = await listMatchesForUser(session.userId);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Matches</h1>
          <p className="text-muted-foreground text-sm">
            Every video, URL, and image you've analyzed.
          </p>
        </div>
        <Button asChild>
          <Link href="/matches/new">
            <PlusCircleIcon className="mr-1 size-4" weight="duotone" />
            New analysis
          </Link>
        </Button>
      </div>

      {matches.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlusCircleIcon className="size-6" weight="duotone" />
            </EmptyMedia>
            <EmptyTitle>No matches yet</EmptyTitle>
            <EmptyDescription>
              Upload a clip, paste a URL, or drop an image to generate your
              first set of per-delivery analytics.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/matches/new">Start a new analysis</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
