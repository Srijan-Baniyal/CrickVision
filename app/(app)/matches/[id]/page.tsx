import { notFound } from "next/navigation";
import { ProcessingStatus } from "@/components/match/ProcessingStatus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { listDeliveriesForMatch } from "@/lib/db/queries/deliveries";
import { getMatchById } from "@/lib/db/queries/matches";

export default async function MatchOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const match = await getMatchById(id, session.userId);
  if (!match) {
    notFound();
  }
  const deliveries = await listDeliveriesForMatch(id);

  const totalRuns = deliveries.reduce((sum, d) => sum + d.runs, 0);
  const totalWickets = deliveries.filter((d) => d.isWicket).length;
  const boundaries = deliveries.filter((d) => d.isBoundary && !d.isSix).length;
  const sixes = deliveries.filter((d) => d.isSix).length;

  return (
    <div className="space-y-6">
      <ProcessingStatus matchId={id} status={match.status} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Deliveries" value={deliveries.length.toString()} />
        <StatCard label="Runs" value={totalRuns.toString()} />
        <StatCard label="Wickets" value={totalWickets.toString()} />
        <StatCard
          label="Boundaries · Sixes"
          value={`${boundaries} · ${sixes}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About this match</CardTitle>
          <CardDescription>
            Source, format, and processing notes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row k="Source kind" v={match.sourceKind} />
          {match.sourceRef ? <Row k="Source" v={match.sourceRef} /> : null}
          <Row k="Format" v={match.format} />
          {match.videoUrl ? <Row k="Video" mono v={match.videoUrl} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-3xl tabular-nums tracking-tight">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({ k, mono, v }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-muted-foreground">
      <span>{k}</span>
      <span className={mono ? "max-w-[60%] truncate font-mono text-xs" : ""}>
        {v}
      </span>
    </div>
  );
}
