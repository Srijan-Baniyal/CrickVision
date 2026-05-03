"use client";

import { useMemo } from "react";
import type { ChartProps } from "@/components/charts/types";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { humanLabel } from "@/lib/format";

type BatterStat = {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal: string;
  wellTimedPct: number;
};

type BowlerStat = {
  name: string;
  balls: number;
  runs: number;
  wickets: number;
  dotPct: number;
  avgLength: number | null;
};

const BALLS_PER_OVER = 6;

export function StatsTable({ deliveries }: ChartProps) {
  const { batters, bowlers } = useMemo(() => {
    const batterMap = new Map<string, BatterStat>();
    const bowlerMap = new Map<string, BowlerStat>();
    let totalLength = 0;
    let totalLengthCount = 0;

    for (const d of deliveries) {
      if (d.batsmanName) {
        const b = batterMap.get(d.batsmanName) ?? {
          name: d.batsmanName,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          dismissal: "not out",
          wellTimedPct: 0,
        };
        b.runs += d.runs;
        b.balls += 1;
        if (d.isSix) {
          b.sixes += 1;
        } else if (d.isBoundary) {
          b.fours += 1;
        }
        if (d.isWicket) {
          b.dismissal = humanLabel(d.dismissalType);
        }
        batterMap.set(d.batsmanName, b);
      }
      if (d.bowlerName) {
        const bw = bowlerMap.get(d.bowlerName) ?? {
          name: d.bowlerName,
          balls: 0,
          runs: 0,
          wickets: 0,
          dotPct: 0,
          avgLength: null,
        };
        bw.balls += 1;
        bw.runs += d.runs;
        if (d.isWicket) {
          bw.wickets += 1;
        }
        if (d.lengthMeters !== null) {
          totalLength += Number(d.lengthMeters);
          totalLengthCount += 1;
        }
        bowlerMap.set(d.bowlerName, bw);
      }
    }
    const batters = [...batterMap.values()];
    const bowlers = [...bowlerMap.values()].map((bw) => {
      const dots = deliveries.filter(
        (d) => d.bowlerName === bw.name && d.runs === 0
      ).length;
      return {
        ...bw,
        dotPct: bw.balls === 0 ? 0 : (dots / bw.balls) * 100,
        avgLength: totalLengthCount > 0 ? totalLength / totalLengthCount : null,
      };
    });
    return { batters, bowlers };
  }, [deliveries]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-4">
        <Table>
          <TableCaption>Batters</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">B</TableHead>
              <TableHead className="text-right">SR</TableHead>
              <TableHead className="text-right">4 / 6</TableHead>
              <TableHead>Dismissal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batters.map((b) => (
              <TableRow key={b.name}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.runs}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.balls}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.balls === 0 ? "—" : ((b.runs / b.balls) * 100).toFixed(1)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.fours} / {b.sixes}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {b.dismissal}
                </TableCell>
              </TableRow>
            ))}
            {batters.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  No batters yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <Table>
          <TableCaption>Bowlers</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">O</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">W</TableHead>
              <TableHead className="text-right">Econ</TableHead>
              <TableHead className="text-right">Dot %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bowlers.map((bw) => {
              const overs = (bw.balls / BALLS_PER_OVER).toFixed(1);
              const econ =
                bw.balls === 0
                  ? "—"
                  : ((bw.runs / bw.balls) * BALLS_PER_OVER).toFixed(2);
              return (
                <TableRow key={bw.name}>
                  <TableCell className="font-medium">{bw.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {overs}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {bw.runs}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {bw.wickets}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {econ}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {bw.dotPct.toFixed(0)}
                  </TableCell>
                </TableRow>
              );
            })}
            {bowlers.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  No bowlers yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
