"use client";

import { DownloadIcon } from "@phosphor-icons/react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ExportFormat, exportMatchAction } from "@/lib/server/export";

export function ExportButton({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition();

  const onExport = (format: ExportFormat) => {
    start(async () => {
      try {
        const result = await exportMatchAction(matchId, format);
        const blob = new Blob([result.body], { type: result.contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${result.filename}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={pending} size="sm" variant="outline">
          <DownloadIcon className="size-4" weight="duotone" />
          {pending ? "Exporting…" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport("csv")}>
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport("json")}>
          Download JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
