import Link from "next/link";
import { notFound } from "next/navigation";
import { DeliveryInspector } from "@/components/delivery/DeliveryInspector";
import { Button } from "@/components/ui/button";
import { getDeliveryById } from "@/lib/db/queries/deliveries";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string; did: string }>;
}) {
  const { id, did } = await params;
  const delivery = await getDeliveryById(did);
  if (!delivery || delivery.matchId !== id) {
    notFound();
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl tracking-tight">
          Over {delivery.overNumber}.{delivery.ballInOver}
        </h2>
        <Button asChild size="sm" variant="outline">
          <Link href={`/matches/${id}/deliveries`}>Back to all deliveries</Link>
        </Button>
      </div>
      <DeliveryInspector delivery={delivery} />
    </div>
  );
}
