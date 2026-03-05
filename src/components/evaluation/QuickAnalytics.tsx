import { BarChart3 } from "lucide-react";
import { HazardTask, AILabel } from "@/types/hazard";
import { cn } from "@/lib/utils";

interface QuickAnalyticsProps {
  data: HazardTask[];
  onOpenDrawer: () => void;
}

function getLabelStatus(label: AILabel): "waiting" | "human_annotated" | "auto_confirmed" {
  if (label.auto_confirmed) return "auto_confirmed";
  if (label.locked && !label.auto_confirmed) return "human_annotated";
  return "waiting";
}

function computeMetrics(data: HazardTask[]) {
  let total = data.length;
  let butuhReview = 0;
  let selesai = 0;
  let autoConfirmed = 0;
  let overrideCount = 0;

  for (const h of data) {
    const fields: ("tbc" | "pspp" | "gr")[] = ["tbc", "pspp", "gr"];
    const statuses = fields.map(f => getLabelStatus(h[f]));

    const anyWaiting = statuses.includes("waiting");
    const allLocked = statuses.every(s => s !== "waiting");

    if (anyWaiting) butuhReview++;
    if (h.status === "completed" || (allLocked && !anyWaiting)) selesai++;
    if (h.status === "auto_confirmed" || statuses.every(s => s === "auto_confirmed")) autoConfirmed++;

    // Override: human changed label different from AI
    for (const f of fields) {
      const label = h[f];
      if (label.locked && !label.auto_confirmed && label.human_label && label.ai_label && label.human_label !== label.ai_label) {
        overrideCount++;
      }
    }
  }

  return { total, butuhReview, selesai, autoConfirmed, overrideCount };
}

const MetricCard = ({ label, value, accent }: { label: string; value: number; accent?: boolean }) => (
  <div className={cn(
    "flex flex-col gap-0.5 px-3 py-2 rounded border min-w-[100px]",
    accent
      ? "border-status-progress/30 bg-status-progress/5"
      : "border-border bg-card"
  )}>
    <span className="text-lg font-bold text-foreground leading-none">{value}</span>
    <span className={cn(
      "text-[10px] font-medium leading-tight",
      accent ? "text-status-progress" : "text-muted-foreground"
    )}>{label}</span>
  </div>
);

const QuickAnalytics = ({ data, onOpenDrawer }: QuickAnalyticsProps) => {
  const m = computeMetrics(data);

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <MetricCard label="Total Task" value={m.total} />
      <MetricCard label="Butuh Review" value={m.butuhReview} accent />
      <MetricCard label="Selesai" value={m.selesai} />
      <MetricCard label="Auto-confirmed" value={m.autoConfirmed} />
      {m.overrideCount > 0 && <MetricCard label="Override" value={m.overrideCount} />}
      <div className="flex-1" />
      <button
        onClick={onOpenDrawer}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-primary/20 bg-primary/5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        Lihat Analytics
      </button>
    </div>
  );
};

export default QuickAnalytics;
