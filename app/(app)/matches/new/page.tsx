import { UploadTabs } from "@/components/match/UploadTabs";

export default function NewMatchPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">New analysis</h1>
        <p className="text-muted-foreground text-sm">
          Three ways in. They produce the same per-delivery records.
        </p>
      </div>
      <UploadTabs />
    </div>
  );
}
