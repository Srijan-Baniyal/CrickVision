import type { DeliveryRow } from "@/lib/db/queries/deliveries";

export type ChartProps = {
  deliveries: readonly DeliveryRow[];
};
