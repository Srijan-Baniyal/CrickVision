import { DeliveryRowItem } from "@/components/delivery/DeliveryRowItem";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { listDeliveriesForMatch } from "@/lib/db/queries/deliveries";

export default async function DeliveriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deliveries = await listDeliveriesForMatch(id);

  if (deliveries.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No deliveries yet</EmptyTitle>
          <EmptyDescription>
            They'll show up here as the analyzer processes the source.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-1">
      {deliveries.map((d) => (
        <DeliveryRowItem delivery={d} key={d.id} matchId={id} />
      ))}
    </div>
  );
}
