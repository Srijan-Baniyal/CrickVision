import type { DeliveryRow } from "@/lib/db/queries/deliveries";

export interface ChartProps {
  deliveries: readonly DeliveryRow[];
}
