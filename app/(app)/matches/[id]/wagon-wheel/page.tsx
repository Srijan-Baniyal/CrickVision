import { ShotZoneHeatMap } from "@/components/charts/ShotZoneHeatMap";
import { WagonWheel } from "@/components/charts/WagonWheel";
import { listDeliveriesForMatch } from "@/lib/db/queries/deliveries";

export default async function WagonWheelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deliveries = await listDeliveriesForMatch(id);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-2">
        <h2 className="font-semibold text-lg tracking-tight">Wagon wheel</h2>
        <p className="text-muted-foreground text-sm">
          One ray per scoring shot. Color = runs, length = exit speed proxy.
        </p>
        <WagonWheel deliveries={deliveries} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold text-lg tracking-tight">
          Shot zone heat map
        </h2>
        <p className="text-muted-foreground text-sm">
          Density of shot direction across all deliveries. Bright = frequent.
        </p>
        <ShotZoneHeatMap deliveries={deliveries} />
      </section>
    </div>
  );
}
