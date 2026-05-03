"use client";

import { scaleSequential } from "d3-scale";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMemo } from "react";
import { humanLabel } from "@/lib/format";
import type { ChartProps } from "./types";

const ZONES = ["middle", "edge", "mishit", "miss"] as const;
const TIMING = ["early", "wellTimed", "late", "mistimed", "missed"] as const;

export function ContactHeatMap({ deliveries }: ChartProps) {
  const { matrix, max } = useMemo(() => {
    const m = ZONES.map(() => TIMING.map(() => 0));
    for (const d of deliveries) {
      if (!(d.contactZone && d.shotTiming)) {
        continue;
      }
      const zi = ZONES.indexOf(d.contactZone);
      const ti = TIMING.indexOf(d.shotTiming);
      if (zi === -1 || ti === -1) {
        continue;
      }
      m[zi][ti] += 1;
    }
    const max = m.reduce(
      (mx, row) => row.reduce((mxx, v) => Math.max(mxx, v), mx),
      0
    );
    return { matrix: m, max };
  }, [deliveries]);

  const color = scaleSequential(interpolateInferno).domain([
    0,
    Math.max(1, max),
  ]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card p-4">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-muted-foreground">
              Contact ↓ / Timing →
            </th>
            {TIMING.map((t) => (
              <th className="px-2 py-1 text-left text-muted-foreground" key={t}>
                {humanLabel(t)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ZONES.map((zone, zi) => (
            <tr key={zone}>
              <th className="px-2 py-1 text-left text-muted-foreground">
                {humanLabel(zone)}
              </th>
              {TIMING.map((t, ti) => {
                const v = matrix[zi][ti];
                const bg = v === 0 ? "transparent" : color(v);
                return (
                  <td
                    className="px-2 py-1 font-mono tabular-nums"
                    key={t}
                    style={{
                      background: bg,
                      color: v > max * 0.5 ? "white" : undefined,
                    }}
                  >
                    {v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
