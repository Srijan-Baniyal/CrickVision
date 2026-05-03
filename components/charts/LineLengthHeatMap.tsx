"use client";

import { hexbin } from "d3-hexbin";
import { scaleSequential } from "d3-scale";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMemo } from "react";
import type { ChartProps } from "./types";

const PITCH_LENGTH_M = 20.12;
const PITCH_WIDTH_M = 3.05;
const VIEW_W = 220;
const VIEW_H = 480;
const HEX_RADIUS = 14;

export function LineLengthHeatMap({ deliveries }: ChartProps) {
  const { hexes, max } = useMemo(() => {
    const points: [number, number][] = [];
    for (const d of deliveries) {
      const pp = d.pitchPoint;
      if (!pp) {
        continue;
      }
      const xNorm = (pp.xPitchM + PITCH_WIDTH_M / 2) / PITCH_WIDTH_M;
      const yNorm = pp.yPitchM / PITCH_LENGTH_M;
      points.push([xNorm * VIEW_W, VIEW_H - yNorm * VIEW_H]);
    }
    const bin = hexbin<[number, number]>()
      .x((p) => p[0])
      .y((p) => p[1])
      .radius(HEX_RADIUS)
      .extent([
        [0, 0],
        [VIEW_W, VIEW_H],
      ]);
    const hexes = bin(points);
    const max = hexes.reduce((m, h) => Math.max(m, h.length), 0);
    return { hexes, max };
  }, [deliveries]);

  const color = useMemo(
    () => scaleSequential(interpolateInferno).domain([0, Math.max(1, max)]),
    [max]
  );

  if (max === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground text-sm">
        No pitch points yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <svg
        aria-label="Line and length heat map"
        className="mx-auto h-auto w-44"
        role="img"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      >
        <title>Line and length heat map</title>
        <rect
          fill="var(--muted)"
          fillOpacity={0.5}
          height={VIEW_H}
          rx={8}
          width={VIEW_W}
        />
        <rect
          fill="var(--foreground)"
          height={3}
          width={26}
          x={VIEW_W / 2 - 13}
          y={2}
        />
        <rect
          fill="var(--foreground)"
          height={3}
          width={26}
          x={VIEW_W / 2 - 13}
          y={VIEW_H - 5}
        />
        {hexes.map((h) => (
          <path
            d={`M${h.x},${h.y}${hexbin().radius(HEX_RADIUS).hexagon()}`}
            fill={color(h.length)}
            fillOpacity={0.85}
            key={`${h.x}-${h.y}`}
            stroke="var(--background)"
            strokeOpacity={0.4}
          />
        ))}
      </svg>
    </div>
  );
}
