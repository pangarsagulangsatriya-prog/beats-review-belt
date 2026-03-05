import { useState, useMemo } from "react";
import { X, Download, BarChart3, TrendingUp, Tag, Layers } from "lucide-react";
import { HazardTask, AILabel } from "@/types/hazard";
import { ColumnFilters } from "./FilterBar";
import { DateRange } from "./DateFilter";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from "recharts";

interface AnalyticsDrawerProps {
  open: boolean;
  onClose: () => void;
  allData: HazardTask[];
  filteredData: HazardTask[];
  dateRange: DateRange;
  filters: ColumnFilters;
}

const CHART_COLORS = [
  "hsl(215, 60%, 42%)",
  "hsl(152, 42%, 38%)",
  "hsl(38, 65%, 48%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 35%, 52%)",
  "hsl(180, 40%, 40%)",
  "hsl(330, 50%, 50%)",
  "hsl(60, 50%, 45%)",
];

function getLabelStatus(label: AILabel): "waiting" | "human_annotated" | "auto_confirmed" {
  if (label.auto_confirmed) return "auto_confirmed";
  if (label.locked && !label.auto_confirmed) return "human_annotated";
  return "waiting";
}

function formatDateRange(range: DateRange): string {
  if (range.from.getTime() === range.to.getTime()) {
    return format(range.from, "dd MMM yyyy", { locale: localeId });
  }
  return `${format(range.from, "dd MMM", { locale: localeId })}–${format(range.to, "dd MMM yyyy", { locale: localeId })}`;
}

type GroupByKey = "site" | "pic_perusahaan" | "lokasi" | "ketidaksesuaian" | "sub_ketidaksesuaian";
const GROUP_OPTIONS: { key: GroupByKey; label: string }[] = [
  { key: "site", label: "Site" },
  { key: "pic_perusahaan", label: "Perusahaan" },
  { key: "lokasi", label: "Lokasi" },
  { key: "ketidaksesuaian", label: "Ketidaksesuaian" },
  { key: "sub_ketidaksesuaian", label: "Sub" },
];

function computeBreakdown(data: HazardTask[], key: GroupByKey) {
  const map = new Map<string, number>();
  for (const h of data) {
    const v = h[key];
    map.set(v, (map.get(v) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, count }));
}

function computeLabelAnalytics(data: HazardTask[], field: "tbc" | "pspp" | "gr") {
  const labelMap = new Map<string, number>();
  let aiPredicted = 0, humanAnnotated = 0, autoConfirmed = 0;

  for (const h of data) {
    const label = h[field];
    const displayText = label.human_label || label.ai_label || "N/A";
    labelMap.set(displayText, (labelMap.get(displayText) || 0) + 1);

    const status = getLabelStatus(label);
    if (status === "waiting") aiPredicted++;
    else if (status === "human_annotated") humanAnnotated++;
    else autoConfirmed++;
  }

  const topLabels = [...labelMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name: name.length > 25 ? name.slice(0, 23) + "…" : name, count }));

  return { topLabels, aiPredicted, humanAnnotated, autoConfirmed };
}

function computeTrend(data: HazardTask[]) {
  const map = new Map<string, number>();
  for (const h of data) {
    const day = h.timestamp.split(" ")[0]; // "2025-09-18"
    map.set(day, (map.get(day) || 0) + 1);
  }
  return [...map.entries()].sort().map(([date, count]) => ({ date, count }));
}

function exportCSV(data: HazardTask[]) {
  const fields: ("tbc" | "pspp" | "gr")[] = ["tbc", "pspp", "gr"];
  const rows = data.map(h => ({
    id: h.id,
    timestamp: h.timestamp,
    site: h.site,
    lokasi: h.lokasi,
    pic_perusahaan: h.pic_perusahaan,
    status: h.status,
    tbc: h.tbc.human_label || h.tbc.ai_label || "",
    pspp: h.pspp.human_label || h.pspp.ai_label || "",
    gr: h.gr.human_label || h.gr.ai_label || "",
  }));
  const headers = Object.keys(rows[0] || {});
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground uppercase tracking-wider mb-2 mt-4 first:mt-0">
    {icon}
    {children}
  </h3>
);

const AnalyticsDrawer = ({ open, onClose, allData, filteredData, dateRange, filters }: AnalyticsDrawerProps) => {
  const [followFilter, setFollowFilter] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByKey>("site");

  const data = followFilter ? filteredData : allData;

  const metrics = useMemo(() => {
    let total = data.length, butuhReview = 0, selesai = 0, autoConfirmed = 0;
    for (const h of data) {
      const fields: ("tbc" | "pspp" | "gr")[] = ["tbc", "pspp", "gr"];
      const statuses = fields.map(f => getLabelStatus(h[f]));
      if (statuses.includes("waiting")) butuhReview++;
      if (h.status === "completed" || statuses.every(s => s !== "waiting")) selesai++;
      if (h.status === "auto_confirmed" || statuses.every(s => s === "auto_confirmed")) autoConfirmed++;
    }
    return { total, butuhReview, selesai, autoConfirmed };
  }, [data]);

  const breakdown = useMemo(() => computeBreakdown(data, groupBy), [data, groupBy]);
  const tbcAnalytics = useMemo(() => computeLabelAnalytics(data, "tbc"), [data]);
  const psppAnalytics = useMemo(() => computeLabelAnalytics(data, "pspp"), [data]);
  const grAnalytics = useMemo(() => computeLabelAnalytics(data, "gr"), [data]);
  const trend = useMemo(() => computeTrend(data), [data]);

  // Active filter chips
  const activeChips = useMemo(() => {
    const chips: string[] = [];
    if (filters.site.length) chips.push(`Site: ${filters.site.length}`);
    if (filters.pic_perusahaan.length) chips.push(`PIC: ${filters.pic_perusahaan.length}`);
    if (filters.lokasi.length) chips.push(`Lokasi: ${filters.lokasi.length}`);
    if (filters.ketidaksesuaian.length) chips.push(`Ketidaksesuaian: ${filters.ketidaksesuaian.length}`);
    if (filters.sub_ketidaksesuaian.length) chips.push(`Sub: ${filters.sub_ketidaksesuaian.length}`);
    return chips;
  }, [filters]);

  if (!open) return null;

  const LabelSection = ({ title, analytics }: { title: string; analytics: ReturnType<typeof computeLabelAnalytics> }) => (
    <div className="mb-3">
      <p className="text-[10px] font-semibold text-foreground mb-1.5">{title}</p>
      <div className="flex gap-3 mb-2 text-[10px]">
        <span className="text-muted-foreground">AI predicted: <span className="font-semibold text-foreground">{analytics.aiPredicted}</span></span>
        <span className="text-muted-foreground">Human: <span className="font-semibold text-foreground">{analytics.humanAnnotated}</span></span>
        <span className="text-muted-foreground">Auto: <span className="font-semibold text-foreground">{analytics.autoConfirmed}</span></span>
      </div>
      {analytics.topLabels.length > 0 ? (
        <div className="space-y-1">
          {analytics.topLabels.map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="w-4 text-right text-muted-foreground font-mono">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${Math.max(8, (l.count / (analytics.topLabels[0]?.count || 1)) * 100)}%` }}
                  />
                  <span className="font-medium text-foreground shrink-0">{l.count}</span>
                </div>
                <span className="text-muted-foreground truncate block">{l.name}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground">Tidak ada data</p>
      )}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/5 z-40" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-card border-l border-border z-50 shadow-xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Analytics</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(data)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="w-3 h-3" />
              Export CSV
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scope bar */}
        <div className="px-4 py-2 border-b border-border bg-muted/30 shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data Scope</p>
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
              📅 {formatDateRange(dateRange)}
            </span>
            {followFilter && activeChips.map(c => (
              <span key={c} className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{c}</span>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={followFilter}
              onChange={(e) => setFollowFilter(e.target.checked)}
              className="accent-primary w-3 h-3"
            />
            <span className="text-[10px] text-muted-foreground">Ikuti filter saat ini</span>
          </label>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-[11px]">
              <p>Tidak ada data pada rentang ini</p>
            </div>
          ) : (
            <>
              {/* Section 1: KPI */}
              <SectionTitle icon={<Layers className="w-3 h-3 text-primary" />}>KPI Ringkas</SectionTitle>
              <div className="grid grid-cols-2 gap-2 mb-1">
                {[
                  { label: "Total Task", value: metrics.total },
                  { label: "Butuh Review", value: metrics.butuhReview, accent: true },
                  { label: "Selesai / Final", value: metrics.selesai },
                  { label: "Auto-confirmed", value: metrics.autoConfirmed },
                ].map(m => (
                  <div key={m.label} className={cn(
                    "px-3 py-2 rounded border",
                    m.accent ? "border-status-progress/30 bg-status-progress/5" : "border-border"
                  )}>
                    <span className="text-lg font-bold text-foreground leading-none block">{m.value}</span>
                    <span className={cn("text-[10px]", m.accent ? "text-status-progress" : "text-muted-foreground")}>{m.label}</span>
                  </div>
                ))}
              </div>

              {/* Section 2: Breakdown */}
              <SectionTitle icon={<BarChart3 className="w-3 h-3 text-primary" />}>Breakdown</SectionTitle>
              <div className="mb-2">
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByKey)}
                  className="text-[10px] border border-border rounded px-2 py-1 bg-background text-foreground"
                >
                  {GROUP_OPTIONS.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
              {breakdown.length > 0 && (
                <div className="h-[180px] mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breakdown} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                      <XAxis type="number" tick={{ fontSize: 9 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                      <RechartsTooltip contentStyle={{ fontSize: 10 }} />
                      <Bar dataKey="count" fill="hsl(215, 60%, 42%)" radius={[0, 2, 2, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Section 3: Label Analytics */}
              <SectionTitle icon={<Tag className="w-3 h-3 text-primary" />}>Label Analytics</SectionTitle>
              <LabelSection title="TBC" analytics={tbcAnalytics} />
              <LabelSection title="PSPP" analytics={psppAnalytics} />
              <LabelSection title="GR" analytics={grAnalytics} />

              {/* Section 4: Trend */}
              <SectionTitle icon={<TrendingUp className="w-3 h-3 text-primary" />}>Trend Waktu</SectionTitle>
              {trend.length > 0 ? (
                <div className="h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <RechartsTooltip contentStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(215, 60%, 42%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">Tidak ada data trend</p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AnalyticsDrawer;
