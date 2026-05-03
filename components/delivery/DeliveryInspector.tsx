"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type BallType,
  ballTypeSchema,
  type ShotType,
  shotTypeSchema,
} from "@/lib/cv/schema";
import type { Delivery } from "@/lib/db/schema/deliveries";
import {
  formatDegrees,
  formatLengthMeters,
  formatSpeedKmh,
  humanLabel,
} from "@/lib/format";
import { submitCorrectionAction } from "@/lib/server/corrections";
import { TrajectoryOverlay } from "./TrajectoryOverlay";

type DeliveryWithJoins = Delivery & {
  bowler: { name: string } | null;
  batsman: { name: string } | null;
};

export function DeliveryInspector({
  delivery,
}: {
  delivery: DeliveryWithJoins;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Clip + trajectory</CardTitle>
          <CardDescription>
            Phased polyline overlay on the broadcast clip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {delivery.clipBlobUrl ? (
            <div className="relative">
              {/* biome-ignore lint/a11y/useMediaCaption: broadcast clip has no captions */}
              <video
                className="aspect-video w-full rounded-md bg-black"
                controls
                preload="metadata"
                src={delivery.clipBlobUrl}
              />
              <TrajectoryOverlay trajectory={delivery.trajectory} />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-md bg-muted text-muted-foreground text-sm">
              No clip available for this delivery.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Read-out</CardTitle>
          <CardDescription>Geometric + semantic fields.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Field k="Bowler" v={delivery.bowler?.name ?? "—"} />
          <Field k="Batsman" v={delivery.batsman?.name ?? "—"} />
          <Field k="Ball type" v={humanLabel(delivery.ballType)} />
          <Field k="Line" v={humanLabel(delivery.line)} />
          <Field k="Length" v={formatLengthMeters(delivery.lengthMeters)} />
          <Field k="Speed" v={formatSpeedKmh(delivery.speedKmh)} />
          <Field
            k="Swing / spin"
            v={`${humanLabel(delivery.swing)} · ${humanLabel(delivery.spin)}`}
          />
          <Field k="Shot type" v={humanLabel(delivery.shotType)} />
          <Field k="Footwork" v={humanLabel(delivery.shotFootwork)} />
          <Field k="Timing" v={humanLabel(delivery.shotTiming)} />
          <Field k="Direction" v={formatDegrees(delivery.shotDirectionDeg)} />
          <Field k="Contact" v={humanLabel(delivery.contactZone)} />
          <Field k="Runs" v={String(delivery.runs)} />
          {delivery.isWicket ? (
            <Badge variant="destructive">
              {humanLabel(delivery.dismissalType)}
            </Badge>
          ) : null}
          {delivery.commentary ? (
            <p className="border-border border-t pt-3 text-muted-foreground italic">
              {delivery.commentary}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <CorrectionForm deliveryId={delivery.id} />
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function CorrectionForm({ deliveryId }: { deliveryId: string }) {
  const [pending, start] = useTransition();
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Correct this delivery</CardTitle>
        <CardDescription>
          Your correction trains the next model. Submit only what's wrong.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            start(async () => {
              const res = await submitCorrectionAction(deliveryId, formData);
              if (res.ok) {
                toast.success("Correction saved");
              } else {
                toast.error(res.error);
              }
            });
          }}
          className="grid gap-4 md:grid-cols-3"
        >
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs" htmlFor="ballType">
              Ball type
            </label>
            <Select name="ballType">
              <SelectTrigger id="ballType">
                <SelectValue placeholder="Leave unchanged" />
              </SelectTrigger>
              <SelectContent>
                {ballTypeSchema.options.map((v) => (
                  <SelectItem key={v} value={v}>
                    {humanLabel(v as BallType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs" htmlFor="shotType">
              Shot type
            </label>
            <Select name="shotType">
              <SelectTrigger id="shotType">
                <SelectValue placeholder="Leave unchanged" />
              </SelectTrigger>
              <SelectContent>
                {shotTypeSchema.options.map((v) => (
                  <SelectItem key={v} value={v}>
                    {humanLabel(v as ShotType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs" htmlFor="note">
              Note
            </label>
            <Textarea
              id="note"
              name="note"
              placeholder="Optional context…"
              rows={1}
            />
          </div>
          <div className="md:col-span-3">
            <Button disabled={pending} type="submit">
              {pending ? "Saving…" : "Submit correction"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
