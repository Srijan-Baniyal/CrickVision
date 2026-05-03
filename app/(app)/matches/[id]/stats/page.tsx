import { ContactHeatMap } from "@/components/charts/ContactHeatMap";
import { OverTimeline } from "@/components/charts/OverTimeline";
import { ShotSelectionPanel } from "@/components/charts/ShotSelectionPanel";
import { StatsTable } from "@/components/match/StatsTable";
import { listDeliveriesForMatch } from "@/lib/db/queries/deliveries";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deliveries = await listDeliveriesForMatch(id);
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="font-semibold text-lg tracking-tight">Over timeline</h2>
        <OverTimeline deliveries={deliveries} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold text-lg tracking-tight">Player stats</h2>
        <StatsTable deliveries={deliveries} />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <h2 className="font-semibold text-lg tracking-tight">
            Shot selection
          </h2>
          <p className="text-muted-foreground text-sm">
            Shot type vs ball type. Cell color = frequency, label = avg runs.
          </p>
          <ShotSelectionPanel deliveries={deliveries} />
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold text-lg tracking-tight">
            Contact heat map
          </h2>
          <p className="text-muted-foreground text-sm">
            Where on the bat (and how the feet moved) the player tends to make
            contact.
          </p>
          <ContactHeatMap deliveries={deliveries} />
        </section>
      </div>
    </div>
  );
}
