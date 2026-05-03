"use server";

import { requireSession } from "@/lib/auth";
import type { DeliveryRow } from "@/lib/db/queries/deliveries";
import { listDeliveriesForMatch } from "@/lib/db/queries/deliveries";
import { getMatchById } from "@/lib/db/queries/matches";

export type ExportFormat = "csv" | "json";

const CSV_COLUMNS = [
  "innings",
  "over",
  "ball",
  "bowler",
  "batsman",
  "ballType",
  "line",
  "lengthMeters",
  "speedKmh",
  "swing",
  "spin",
  "shotType",
  "shotFootwork",
  "shotTiming",
  "shotDirectionDeg",
  "contactZone",
  "runs",
  "isBoundary",
  "isSix",
  "isWicket",
  "dismissalType",
] as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function deliveryToRow(d: DeliveryRow): Record<string, unknown> {
  return {
    innings: d.inningsNumber,
    over: d.overNumber,
    ball: d.ballInOver,
    bowler: d.bowlerName ?? "",
    batsman: d.batsmanName ?? "",
    ballType: d.ballType ?? "",
    line: d.line ?? "",
    lengthMeters: d.lengthMeters ?? "",
    speedKmh: d.speedKmh ?? "",
    swing: d.swing ?? "",
    spin: d.spin ?? "",
    shotType: d.shotType ?? "",
    shotFootwork: d.shotFootwork ?? "",
    shotTiming: d.shotTiming ?? "",
    shotDirectionDeg: d.shotDirectionDeg ?? "",
    contactZone: d.contactZone ?? "",
    runs: d.runs,
    isBoundary: d.isBoundary,
    isSix: d.isSix,
    isWicket: d.isWicket,
    dismissalType: d.dismissalType,
  };
}

export interface ExportResult {
  body: string;
  contentType: string;
  filename: string;
}

export async function exportMatchAction(
  matchId: string,
  format: ExportFormat
): Promise<ExportResult> {
  const session = await requireSession();
  const match = await getMatchById(matchId, session.userId);
  if (!match) {
    throw new Error("Match not found");
  }
  const deliveries = await listDeliveriesForMatch(matchId);
  const safeTitle = match.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const stamp = new Date().toISOString().split("T")[0];
  const filename = `${safeTitle}-${stamp}.${format}`;

  if (format === "json") {
    return {
      filename,
      contentType: "application/json",
      body: JSON.stringify(
        {
          match: {
            id: match.id,
            title: match.title,
            format: match.format,
            venue: match.venue,
            sourceKind: match.sourceKind,
          },
          deliveries: deliveries.map(deliveryToRow),
        },
        null,
        2
      ),
    };
  }

  const lines: string[] = [CSV_COLUMNS.join(",")];
  for (const d of deliveries) {
    const row = deliveryToRow(d);
    lines.push(CSV_COLUMNS.map((c) => csvEscape(row[c])).join(","));
  }
  return {
    filename,
    contentType: "text/csv",
    body: lines.join("\n"),
  };
}
