"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ChartProps } from "./types";

const SIZE = 360;
const PADDING = 24;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - PADDING;
const PITCH_HALF = 12;
const PITCH_WIDTH = 24;
const PITCH_LENGTH = 80;

const RUN_COLORS = [
  "var(--muted-foreground)", // 0
  "var(--chart-2)", // 1
  "var(--chart-3)", // 2
  "var(--chart-1)", // 3
  "var(--chart-4)", // 4
  "var(--chart-5)", // 5
  "var(--destructive)", // 6
] as const;

const ringRadii = [0.25, 0.5, 0.75, 1].map((r) => r * RADIUS);

export function WagonWheel({ deliveries }: ChartProps) {
  const rays = useMemo(
    () =>
      deliveries
        .filter(
          (d) =>
            d.shotDirectionDeg !== null &&
            d.shotDirectionDeg !== undefined &&
            d.runs > 0
        )
        .map((d) => {
          const deg = Number(d.shotDirectionDeg);
          // Convention: 0° = straight down the ground from batter's view.
          // SVG y is inverted — straight down should point UP on screen.
          const rad = (deg * Math.PI) / 180;
          const length = RADIUS * Math.min(1, 0.4 + d.runs / 6);
          const x = CENTER + Math.sin(rad) * length;
          const y = CENTER - Math.cos(rad) * length;
          return {
            id: d.id,
            x,
            y,
            color: RUN_COLORS[Math.min(d.runs, RUN_COLORS.length - 1)],
            runs: d.runs,
          };
        }),
    [deliveries]
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <svg
        aria-label="Wagon wheel"
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        <title>Wagon wheel of all scoring shots</title>
        {/* Boundary circle */}
        <circle
          cx={CENTER}
          cy={CENTER}
          fill="var(--muted)"
          fillOpacity={0.25}
          r={RADIUS}
          stroke="var(--border)"
        />
        {/* Inner rings */}
        {ringRadii.slice(0, -1).map((r) => (
          <circle
            cx={CENTER}
            cy={CENTER}
            fill="none"
            key={r}
            r={r}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        {/* Pitch rectangle */}
        <rect
          fill="var(--muted-foreground)"
          fillOpacity={0.18}
          height={PITCH_LENGTH}
          width={PITCH_WIDTH}
          x={CENTER - PITCH_HALF}
          y={CENTER - PITCH_LENGTH / 2}
        />
        {/* Rays */}
        {rays.map((ray) => (
          <g key={ray.id}>
            <line
              stroke={ray.color}
              strokeLinecap="round"
              strokeWidth={2}
              x1={CENTER}
              x2={ray.x}
              y1={CENTER}
              y2={ray.y}
            />
            <Link href={`#${ray.id}`}>
              <circle
                cx={ray.x}
                cy={ray.y}
                fill={ray.color}
                r={ray.runs >= 4 ? 4 : 2}
              />
            </Link>
          </g>
        ))}
        {/* Field labels */}
        <text
          className="fill-muted-foreground"
          fontSize={10}
          textAnchor="middle"
          x={CENTER}
          y={PADDING - 6}
        >
          Straight
        </text>
        <text
          className="fill-muted-foreground"
          fontSize={10}
          textAnchor="middle"
          x={CENTER}
          y={SIZE - 8}
        >
          Behind
        </text>
        <text
          className="fill-muted-foreground"
          fontSize={10}
          textAnchor="end"
          x={SIZE - 6}
          y={CENTER + 3}
        >
          Off
        </text>
        <text
          className="fill-muted-foreground"
          fontSize={10}
          textAnchor="start"
          x={6}
          y={CENTER + 3}
        >
          Leg
        </text>
      </svg>
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
      {RUN_COLORS.map((color, runs) => (
        <span className="flex items-center gap-1" key={color}>
          <span
            aria-hidden
            className="size-3 rounded-full"
            style={{ background: color }}
          />
          {runs}
        </span>
      ))}
    </div>
  );
}
