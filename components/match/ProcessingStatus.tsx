"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

type Status = "uploading" | "processing" | "ready" | "failed";

const TITLES: Record<Status, string> = {
  uploading: "Uploading source",
  processing: "Analyzing match",
  ready: "Analysis complete",
  failed: "Analysis failed",
};

function statusDescription(status: Status, deliveryCount: number): string {
  if (status === "processing") {
    return `Extracting deliveries… ${deliveryCount} found so far.`;
  }
  if (status === "uploading") {
    return "Source media is being uploaded to storage.";
  }
  return "Open the match logs to see the failure detail.";
}

export function ProcessingStatus({
  matchId,
  status: initialStatus,
}: {
  matchId: string;
  status: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [count, setCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (status === "ready" || status === "failed") {
      return;
    }
    const url = `/api/matches/${matchId}/stream`;
    const source = new EventSource(url);
    let lastNotifiedCount = 0;

    source.addEventListener("delivery", (ev) => {
      const data = JSON.parse(ev.data) as { count: number };
      setCount(data.count);
      // Toast every ball but coalesce when multiple arrive between polls.
      if (data.count > lastNotifiedCount) {
        const delta = data.count - lastNotifiedCount;
        toast.success(
          delta === 1
            ? `Ball ${data.count} processed`
            : `${delta} more deliveries processed (${data.count} total)`,
          { duration: 2500 }
        );
        lastNotifiedCount = data.count;
      }
    });
    source.addEventListener("ready", () => {
      setStatus("ready");
      toast.success("Match analysis complete", { duration: 4000 });
      source.close();
      router.refresh();
    });
    source.addEventListener("failed", () => {
      setStatus("failed");
      toast.error("Match analysis failed", { duration: 5000 });
      source.close();
    });
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, [matchId, router, status]);

  if (status === "ready") {
    return null;
  }

  return (
    <Alert variant={status === "failed" ? "destructive" : "default"}>
      {status === "processing" || status === "uploading" ? (
        <Spinner className="size-4" />
      ) : null}
      <AlertTitle>{TITLES[status]}</AlertTitle>
      <AlertDescription>{statusDescription(status, count)}</AlertDescription>
    </Alert>
  );
}
