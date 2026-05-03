import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { DeliveryRow } from "@/lib/db/queries/deliveries";
import {
  formatDegrees,
  formatLengthMeters,
  formatSpeedKmh,
  humanLabel,
} from "@/lib/format";

export function DeliveryRowItem({
  delivery,
  matchId,
}: {
  delivery: DeliveryRow;
  matchId: string;
}) {
  return (
    <Link
      className="group flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/50"
      href={`/matches/${matchId}/deliveries/${delivery.id}`}
    >
      <div className="w-16 font-mono text-muted-foreground text-sm tabular-nums">
        {delivery.overNumber}.{delivery.ballInOver}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">{humanLabel(delivery.ballType)}</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="secondary">{humanLabel(delivery.shotType)}</Badge>
          {delivery.isWicket ? (
            <Badge variant="destructive">
              {humanLabel(delivery.dismissalType)}
            </Badge>
          ) : null}
          {delivery.isSix ? <Badge>6</Badge> : null}
          {delivery.isBoundary && !delivery.isSix ? <Badge>4</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-3 text-muted-foreground text-xs">
          <span>{formatSpeedKmh(delivery.speedKmh)}</span>
          <span>{formatLengthMeters(delivery.lengthMeters)}</span>
          <span>{humanLabel(delivery.line)}</span>
          <span>{formatDegrees(delivery.shotDirectionDeg)}</span>
        </div>
      </div>

      <div className="text-right">
        <div className="font-semibold text-lg tabular-nums">
          {delivery.runs}
        </div>
        <div className="text-muted-foreground text-xs">runs</div>
      </div>

      <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
