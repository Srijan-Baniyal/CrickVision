"use client";

import { scaleSequential } from "d3-scale";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMemo } from "react";
import { humanLabel } from "@/lib/format";
import type { ChartProps } from "./types";

const SHOT_TYPES = [
  "defensive",
  "leave",
  "drive",
  "cut",
  "pull",
  "hook",
  "sweep",
  "reverseSweep",
  "scoop",
  "flick",
  "glance",
  "loft",
] as const;

const BALL_TYPES = [
  "yorker",
  "full",
  "goodLength",
  "shortOfLength",
  "short",
  "bouncer",
] as const;

export function ShotSelectionPanel({ deliveries }: ChartProps) {
  const { matrix, runsMatrix, max } = useMemo(() => {
    const m = SHOT_TYPES.map(() => BALL_TYPES.map(() => 0));
    const r = SHOT_TYPES.map(() => BALL_TYPES.map(() => 0));
    for (const d of deliveries) {
      if (!(d.shotType && d.ballType)) {
        continue;
      }
      const si = SHOT_TYPES.indexOf(d.shotType);
      const bi = BALL_TYPES.indexOf(d.ballType as (typeof BALL_TYPES)[number]);
      if (si === -1 || bi === -1) {
        continue;
      }
      m[si][bi] += 1;
      r[si][bi] += d.runs;
    }
    const max = m.reduce(
      (mx, row) => row.reduce((mxx, v) => Math.max(mxx, v), mx),
      0
    );
    return { matrix: m, runsMatrix: r, max };
  }, [deliveries]);

  const color = scaleSequential(interpolateInferno).domain([
    0,
    Math.max(1, max),
  ]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card p-4">
      <table className="w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-muted-foreground" />
            {BALL_TYPES.map((b) => (
              <th
                className="px-2 py-1 text-left font-normal text-muted-foreground"
                key={b}
              >
                {humanLabel(b)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHOT_TYPES.map((shot, si) => (
            <tr key={shot}>
              <th className="px-2 py-1 text-left font-normal text-muted-foreground">
                {humanLabel(shot)}
              </th>
              {BALL_TYPES.map((b, bi) => {
                const count = matrix[si][bi];
                const runs = runsMatrix[si][bi];
                const avg = count === 0 ? 0 : runs / count;
                return (
                  <td
                    className="px-2 py-1 font-mono tabular-nums"
                    key={b}
                    style={{
                      background: count === 0 ? "transparent" : color(count),
                      color:
                        count > max * 0.5 ? "white" : "var(--muted-foreground)",
                    }}
                    title={`${count} balls, avg ${avg.toFixed(2)} runs`}
                  >
                    {count === 0 ? "·" : `${count}/${avg.toFixed(1)}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-muted-foreground text-xs">
        Cells show <span className="font-mono">count/avg-runs</span>. Color =
        count.
      </p>
    </div>
  );
}
