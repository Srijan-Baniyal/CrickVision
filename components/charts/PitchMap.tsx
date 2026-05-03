"use client";

import { useMemo } from "react";
import type { ChartProps } from "./types";

// Top-down 2D pitch view. Real cricket pitch: 22 yd × 10 ft. We render the
// striker at the bottom and the bowler at the top so pitch points (4–8 m
// from striker) sit naturally upper-half.

const PITCH_LENGTH_M = 20.12;
const PITCH_WIDTH_M = 3.05;
const VIEW_W = 220;
const VIEW_H = 480;

const LENGTH_BANDS = [
  { from: 0, to: 2, color: "var(--chart-1)", label: "Yorker" },
  { from: 2, to: 4, color: "var(--chart-2)", label: "Full" },
  { from: 4, to: 6, color: "var(--chart-3)", label: "Good" },
  { from: 6, to: 9, color: "var(--chart-4)", label: "Short of length" },
  { from: 9, to: 22, color: "var(--chart-5)", label: "Short" },
] as const;

const colorForLength = (m: number) =>
  LENGTH_BANDS.find((b) => m >= b.from && m < b.to)?.color ??
  "var(--muted-foreground)";

export function PitchMap({ deliveries }: ChartProps) {
  const dots = useMemo(() => {
    return deliveries
      .filter((d) => d.pitchPoint)
      .map((d) => {
        const pp = d.pitchPoint;
        if (!pp) {
          return null;
        }
        // Pitch coords: x in [-1.525, 1.525], y in [0, 20.12].
        const xNorm = (pp.xPitchM + PITCH_WIDTH_M / 2) / PITCH_WIDTH_M;
        const yNorm = pp.yPitchM / PITCH_LENGTH_M;
        const speed = d.speedKmh ? Number(d.speedKmh) : 130;
        return {
          id: d.id,
          x: xNorm * VIEW_W,
          y: VIEW_H - yNorm * VIEW_H, // bowler up, striker down
          color: colorForLength(Number(d.lengthMeters ?? pp.yPitchM)),
          radius: 2 + ((speed - 100) / 70) * 4,
        };
      })
      .filter(Boolean);
  }, [deliveries]);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <svg
        aria-label="Pitch map"
        className="mx-auto h-auto w-44"
        role="img"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      >
        <title>Pitch map of delivery pitch points</title>
        <rect
          fill="var(--muted)"
          fillOpacity={0.5}
          height={VIEW_H}
          rx={8}
          width={VIEW_W}
        />
        {/* Crease lines */}
        <line
          stroke="var(--border)"
          strokeDasharray="4 4"
          x1={0}
          x2={VIEW_W}
          y1={VIEW_H * 0.06}
          y2={VIEW_H * 0.06}
        />
        <line
          stroke="var(--border)"
          strokeDasharray="4 4"
          x1={0}
          x2={VIEW_W}
          y1={VIEW_H * 0.94}
          y2={VIEW_H * 0.94}
        />
        {/* Stumps */}
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
        {/* Length bands */}
        {LENGTH_BANDS.map((band) => {
          const yTop = VIEW_H - (band.to / PITCH_LENGTH_M) * VIEW_H;
          const height = ((band.to - band.from) / PITCH_LENGTH_M) * VIEW_H;
          return (
            <rect
              fill={band.color}
              fillOpacity={0.08}
              height={height}
              key={band.label}
              width={VIEW_W}
              x={0}
              y={yTop}
            />
          );
        })}
        {dots.map((dot) =>
          dot ? (
            <circle
              cx={dot.x}
              cy={dot.y}
              fill={dot.color}
              fillOpacity={0.85}
              key={dot.id}
              r={dot.radius}
              stroke="var(--background)"
            />
          ) : null
        )}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-1 text-muted-foreground text-xs">
        {LENGTH_BANDS.map((band) => (
          <div className="flex items-center gap-1.5" key={band.label}>
            <span
              aria-hidden
              className="size-2.5 rounded"
              style={{ background: band.color }}
            />
            {band.label}
          </div>
        ))}
      </div>
    </div>
  );
}
