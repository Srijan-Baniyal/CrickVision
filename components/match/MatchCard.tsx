import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MatchRow } from "@/lib/db/queries/matches";

const STATUS_VARIANT: Record<
  MatchRow["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  uploading: "secondary",
  processing: "default",
  ready: "outline",
  failed: "destructive",
};

const STATUS_LABEL: Record<MatchRow["status"], string> = {
  uploading: "Uploading",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

export function MatchCard({ match }: { match: MatchRow }) {
  const created = new Date(match.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{match.title}</CardTitle>
            <CardDescription>
              {match.format} · {match.venue ?? "Venue unknown"}
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANT[match.status]}>
            {STATUS_LABEL[match.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Source</span>
          <span className="font-mono">{match.sourceKind}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Deliveries</span>
          <span className="font-mono">{match.deliveryCount}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Created</span>
          <span>{created}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" variant="outline">
          <Link href={`/matches/${match.id}`}>
            Open
            <ArrowRightIcon className="ml-1 size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
