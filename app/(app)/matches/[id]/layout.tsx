import { notFound } from "next/navigation";
import { ExportButton } from "@/components/match/ExportButton";
import { MatchTabs } from "@/components/match/MatchTabs";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth";
import { getMatchById } from "@/lib/db/queries/matches";

export default async function MatchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const match = await getMatchById(id, session.userId);
  if (!match) {
    notFound();
  }
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">
              {match.title}
            </h1>
            <Badge variant="outline">{match.format}</Badge>
            <Badge variant="secondary">{match.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {match.venue ?? "Venue unknown"} · {match.deliveryCount} deliveries
          </p>
        </div>
        <ExportButton matchId={id} />
      </header>
      <MatchTabs matchId={id} />
      <div>{children}</div>
    </div>
  );
}
