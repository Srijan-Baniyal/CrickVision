"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartProps } from "./types";

type OverPoint = {
  over: string;
  runs: number;
  wickets: number;
};

const HEIGHT = 240;

export function OverTimeline({ deliveries }: ChartProps) {
  const data = useMemo<OverPoint[]>(() => {
    const map = new Map<string, OverPoint>();
    for (const d of deliveries) {
      const key = `${d.inningsNumber}-${d.overNumber}`;
      const existing = map.get(key) ?? {
        over: `${d.inningsNumber}.${d.overNumber}`,
        runs: 0,
        wickets: 0,
      };
      existing.runs += d.runs;
      if (d.isWicket) {
        existing.wickets += 1;
      }
      map.set(key, existing);
    }
    return [...map.values()];
  }, [deliveries]);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground text-sm">
        No overs to chart yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer height={HEIGHT} width="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
          <XAxis dataKey="over" stroke="var(--muted-foreground)" />
          <YAxis stroke="var(--muted-foreground)" />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="runs" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="wickets"
            fill="var(--destructive)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
