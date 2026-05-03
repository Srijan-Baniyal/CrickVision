import { LineLengthHeatMap } from "@/components/charts/LineLengthHeatMap";
import { PitchMap } from "@/components/charts/PitchMap";
import { listDeliveriesForMatch } from "@/lib/db/queries/deliveries";

export default async function PitchMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deliveries = await listDeliveriesForMatch(id);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-2">
        <h2 className="font-semibold text-lg tracking-tight">Pitch map</h2>
        <p className="text-muted-foreground text-sm">
          Each dot is one delivery's pitch point. Color = length, size = speed.
        </p>
        <PitchMap deliveries={deliveries} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold text-lg tracking-tight">
          Line/length heat map
        </h2>
        <p className="text-muted-foreground text-sm">
          Density of pitch points. Bright zones are bowlers' favorites.
        </p>
        <LineLengthHeatMap deliveries={deliveries} />
      </section>
    </div>
  );
}
