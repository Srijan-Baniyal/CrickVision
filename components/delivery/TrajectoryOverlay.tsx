"use client";

import { useMemo } from "react";
import type { Trajectory, TrajectoryFrame } from "@/lib/db/schema/deliveries";

const VIEW_W = 1280;
const VIEW_H = 720;
const PITCH_LENGTH_M = 20.12;
const PITCH_WIDTH_M = 3.05;

const PHASE_COLOR: Record<TrajectoryFrame["phase"], string> = {
  approach: "white",
  bounce: "#fbbf24",
  afterBounce: "#fbbf24",
  impact: "#22c55e",
  afterImpact: "#22c55e",
};

// Maps pitch coordinates → screen coordinates of an assumed broadcast camera
// behind the bowler. Real homography lives server-side; this is a passable
// projection for visual overlay until per-clip H matrices are exported.
function project(frame: TrajectoryFrame): { x: number; y: number } {
  const xNorm = (frame.xPitchM + PITCH_WIDTH_M / 2) / PITCH_WIDTH_M;
  const yNorm = frame.yPitchM / PITCH_LENGTH_M;
  return {
    x: xNorm * VIEW_W,
    y: VIEW_H - yNorm * VIEW_H,
  };
}

export function TrajectoryOverlay({
  trajectory,
}: {
  trajectory: Trajectory | null;
}) {
  const segments = useMemo(() => {
    if (!trajectory || trajectory.frames.length < 2) {
      return [];
    }
    const out: { id: string; d: string; color: string }[] = [];
    for (let i = 1; i < trajectory.frames.length; i += 1) {
      const a = project(trajectory.frames[i - 1]);
      const b = project(trajectory.frames[i]);
      const f = trajectory.frames[i];
      out.push({
        id: `${f.tMs}-${f.phase}-${a.x.toFixed(1)}-${b.x.toFixed(1)}`,
        d: `M${a.x},${a.y} L${b.x},${b.y}`,
        color: PHASE_COLOR[f.phase],
      });
    }
    return out;
  }, [trajectory]);

  if (segments.length === 0) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
    >
      <title>Ball trajectory overlay</title>
      {segments.map((s) => (
        <path
          d={s.d}
          fill="none"
          key={s.id}
          stroke={s.color}
          strokeLinecap="round"
          strokeOpacity={0.85}
          strokeWidth={3}
        />
      ))}
    </svg>
  );
}
