"use client";

import { scaleSequential } from "d3-scale";
import { interpolateInferno } from "d3-scale-chromatic";
import { useMemo } from "react";
import type { ChartProps } from "./types";

const SIZE = 360;
const PADDING = 24;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - PADDING;

const ANGLE_BINS = 24; // 15° per slice
const RADIAL_BINS = 4;

export function ShotZoneHeatMap({ deliveries }: ChartProps) {
  const { bins, max } = useMemo(() => {
    const counts = new Array<number>(ANGLE_BINS * RADIAL_BINS).fill(0);
    for (const d of deliveries) {
      if (d.shotDirectionDeg === null || d.shotDirectionDeg === undefined) {
        continue;
      }
      const deg = ((Number(d.shotDirectionDeg) % 360) + 360) % 360;
      const angleBin = Math.floor((deg / 360) * ANGLE_BINS);
      // Use runs as proxy for radial distance.
      const runsClamped = Math.min(d.runs, 6);
      const radialBin = Math.min(
        RADIAL_BINS - 1,
        Math.floor((runsClamped / 6) * RADIAL_BINS)
      );
      counts[angleBin * RADIAL_BINS + radialBin] += 1;
    }
    const max = counts.reduce((m, c) => Math.max(m, c), 0);
    return { bins: counts, max };
  }, [deliveries]);

  const color = useMemo(
    () => scaleSequential(interpolateInferno).domain([0, Math.max(1, max)]),
    [max]
  );

  if (max === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground text-sm">
        No shot direction data yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <svg
        aria-label="Shot zone heat map"
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        <title>Shot direction density</title>
        <circle
          cx={CENTER}
          cy={CENTER}
          fill="var(--muted)"
          fillOpacity={0.3}
          r={RADIUS}
        />
        {bins.map((count, i) => {
          if (count === 0) {
            return null;
          }
          const angleBin = Math.floor(i / RADIAL_BINS);
          const radialBin = i % RADIAL_BINS;
          const startAngle = (angleBin / ANGLE_BINS) * Math.PI * 2;
          const endAngle = ((angleBin + 1) / ANGLE_BINS) * Math.PI * 2;
          const innerR = (radialBin / RADIAL_BINS) * RADIUS;
          const outerR = ((radialBin + 1) / RADIAL_BINS) * RADIUS;
          return (
            <path
              d={annulusSlice(startAngle, endAngle, innerR, outerR, CENTER)}
              fill={color(count)}
              fillOpacity={0.9}
              key={i}
              stroke="var(--background)"
              strokeOpacity={0.3}
            />
          );
        })}
      </svg>
    </div>
  );
}

function annulusSlice(
  a0: number,
  a1: number,
  rIn: number,
  rOut: number,
  c: number
): string {
  // 0° = straight down the ground = up on screen → subtract π/2.
  const adjust = -Math.PI / 2;
  const x0o = c + Math.cos(a0 + adjust) * rOut;
  const y0o = c + Math.sin(a0 + adjust) * rOut;
  const x1o = c + Math.cos(a1 + adjust) * rOut;
  const y1o = c + Math.sin(a1 + adjust) * rOut;
  const x1i = c + Math.cos(a1 + adjust) * rIn;
  const y1i = c + Math.sin(a1 + adjust) * rIn;
  const x0i = c + Math.cos(a0 + adjust) * rIn;
  const y0i = c + Math.sin(a0 + adjust) * rIn;
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0o},${y0o} A${rOut},${rOut} 0 ${largeArc} 1 ${x1o},${y1o} L${x1i},${y1i} A${rIn},${rIn} 0 ${largeArc} 0 ${x0i},${y0i} Z`;
}
