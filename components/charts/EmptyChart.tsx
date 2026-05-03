export function EmptyChart({ hint, title }: { title: string; hint?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-lg border border-border border-dashed bg-card text-muted-foreground text-sm">
      <span className="font-medium text-foreground">{title}</span>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}
