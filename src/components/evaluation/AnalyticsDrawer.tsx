import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, Download, BarChart3, Info, Search, ChevronDown, CalendarDays, RotateCcw, ArrowRightToLine, Check } from "lucide-react";
import { HazardTask, AILabel } from "@/types/hazard";
import { ColumnFilters, emptyFilters } from "./FilterBar";
import { DateRange } from "./DateFilter";
import { format, startOfDay, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Sector
} from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// ─── Types ──────────────────────────────────────────────────
interface AnalyticsDrawerProps {
  open: boolean;
  onClose: () => void;
  allData: HazardTask[];
  filteredData: HazardTask[];
  dateRange: DateRange;
  filters: ColumnFilters;
  onApplyToPage?: (dateRange: DateRange, filters: ColumnFilters) => void;
}

type DatePreset = { label: string; from: Date; to: Date };

// ─── Constants ──────────────────────────────────────────────
const PIE_COLORS = [
  "hsl(215, 55%, 45%)",
  "hsl(152, 42%, 40%)",
  "hsl(38, 60%, 50%)",
  "hsl(0, 55%, 50%)",
  "hsl(270, 35%, 52%)",
  "hsl(180, 40%, 42%)",
  "hsl(330, 45%, 48%)",
  "hsl(60, 45%, 42%)",
  "hsl(200, 40%, 50%)",
  "hsl(100, 35%, 42%)",
];

const OTHERS_COLOR = "hsl(220, 10%, 75%)";

// ─── Helpers ────────────────────────────────────────────────
function isFinal(label: AILabel): boolean {
  return label.locked || label.auto_confirmed;
}

function isWaiting(label: AILabel): boolean {
  return !isFinal(label);
}

function getFinalLabel(label: AILabel): string | null {
  if (!isFinal(label)) return null;
  return label.human_label || label.ai_label || null;
}

function getDatePresets(): DatePreset[] {
  const today = startOfDay(new Date());
  return [
    { label: "Hari ini", from: today, to: today },
    { label: "Kemarin", from: subDays(today, 1), to: subDays(today, 1) },
    { label: "7 hari terakhir", from: subDays(today, 6), to: today },
    { label: "30 hari terakhir", from: subDays(today, 29), to: today },
  ];
}

function formatDateCompact(range: DateRange): string {
  if (range.from.getTime() === range.to.getTime()) {
    return format(range.from, "dd MMM yyyy", { locale: localeId });
  }
  if (range.from.getFullYear() === range.to.getFullYear()) {
    return `${format(range.from, "dd", { locale: localeId })}–${format(range.to, "dd MMM yyyy", { locale: localeId })}`;
  }
  return `${format(range.from, "dd MMM yyyy", { locale: localeId })}–${format(range.to, "dd MMM yyyy", { locale: localeId })}`;
}

function dateRangesEqual(a: DateRange, b: DateRange): boolean {
  return a.from.getTime() === b.from.getTime() && a.to.getTime() === b.to.getTime();
}

function filtersEqual(a: ColumnFilters, b: ColumnFilters): boolean {
  const keys = Object.keys(a) as (keyof ColumnFilters)[];
  return keys.every(k => {
    const aArr = a[k], bArr = b[k];
    if (aArr.length !== bArr.length) return false;
    return aArr.every((v, i) => v === bArr[i]);
  });
}

function computeFinalDistribution(data: HazardTask[], field: "tbc" | "pspp" | "gr") {
  const labelMap = new Map<string, number>();
  let finalCount = 0, waitingCount = 0;
  const fieldName = field.toUpperCase();

  for (const h of data) {
    const label = h[field];
    if (isFinal(label)) {
      finalCount++;
      const text = getFinalLabel(label) || "N/A";
      labelMap.set(text, (labelMap.get(text) || 0) + 1);
    } else {
      waitingCount++;
    }
  }

  // Add Non-* entry
  if (waitingCount > 0) {
    labelMap.set(`Non-${fieldName}`, waitingCount);
  }

  const sorted = [...labelMap.entries()]
    .sort((a, b) => b[1] - a[1]);

  // If too many, group into Others
  const MAX_SLICES = 7;
  let pieData: { name: string; value: number; isOthers?: boolean }[];
  if (sorted.length <= MAX_SLICES) {
    pieData = sorted.map(([name, value]) => ({ name, value }));
  } else {
    const top = sorted.slice(0, MAX_SLICES - 1);
    const othersSum = sorted.slice(MAX_SLICES - 1).reduce((s, [, v]) => s + v, 0);
    pieData = [
      ...top.map(([name, value]) => ({ name, value })),
      { name: "Others", value: othersSum, isOthers: true },
    ];
  }

  const tableData = sorted.map(([name, value]) => ({
    name,
    value,
    pct: data.length > 0 ? Math.round((value / data.length) * 100) : 0,
  }));

  return { pieData, tableData, finalCount, waitingCount, total: data.length };
}

function exportCSV(data: HazardTask[]) {
  const rows = data.map(h => ({
    id: h.id, timestamp: h.timestamp, site: h.site, lokasi: h.lokasi,
    pic_perusahaan: h.pic_perusahaan, status: h.status,
    tbc: h.tbc.human_label || h.tbc.ai_label || "",
    pspp: h.pspp.human_label || h.pspp.ai_label || "",
    gr: h.gr.human_label || h.gr.ai_label || "",
  }));
  const headers = Object.keys(rows[0] || {});
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Sub-components ─────────────────────────────────────────

/** Ratio bar: Waiting vs Final */
const RatioBar = ({ waiting, final: finalVal }: { waiting: number; final: number }) => {
  const total = waiting + finalVal;
  if (total === 0) return null;
  const finalPct = (finalVal / total) * 100;
  const waitingPct = (waiting / total) * 100;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mt-2">
            <div className="flex h-2 rounded-full overflow-hidden bg-muted">
              <div
                className="h-full transition-all"
                style={{ width: `${waitingPct}%`, backgroundColor: "hsl(220, 12%, 72%)" }}
              />
              <div
                className="h-full transition-all"
                style={{ width: `${finalPct}%`, backgroundColor: "hsl(215, 55%, 45%)" }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
              <span>Menunggu {waiting}</span>
              <span>Final {finalVal}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-[10px] p-3">
          <p className="font-semibold mb-1">Definisi</p>
          <p className="text-muted-foreground mb-0.5"><strong>Menunggu</strong> = belum final (AI predicted / pending review)</p>
          <p className="text-muted-foreground"><strong>Final</strong> = sudah dikonfirmasi (human / auto-confirm)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/** Info icon with tooltip */
const InfoTip = ({ text }: { text: string }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3 h-3 text-muted-foreground cursor-help shrink-0" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-[10px]">
        {text}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/** Scorecard */
const Scorecard = ({ label, value, waiting, finalVal, tip }: { label: string; value: number; waiting: number; finalVal: number; tip: string }) => (
  <div className="bg-card border border-border rounded-lg p-4">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <InfoTip text={tip} />
    </div>
    <span className="text-2xl font-bold text-foreground leading-none block">{value}</span>
    <RatioBar waiting={waiting} final={finalVal} />
  </div>
);

/** Analytics filter multi-select with Apply/Cancel */
function AnalyticsMultiSelect({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(query.toLowerCase()));
  const hasSelected = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setQuery(""); }}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all whitespace-nowrap",
          hasSelected ? "border-primary/30 bg-primary/5 text-primary" : "border-border text-foreground hover:bg-muted"
        )}
      >
        {label}{hasSelected && ` (${selected.length})`}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-[70] bg-popover border border-border rounded-lg shadow-xl w-60 overflow-hidden">
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text" placeholder={`Search ${label.toLowerCase()}...`}
                value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-transparent border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="max-h-40 overflow-auto py-1">
            {filteredOptions.length === 0 && <p className="px-3 py-2 text-[11px] text-muted-foreground">Tidak ada hasil</p>}
            {filteredOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-muted/50 cursor-pointer">
                <input type="checkbox" checked={draft.includes(opt)} onChange={() => setDraft(prev => prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt])} className="accent-primary w-3 h-3" />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-border flex items-center justify-end gap-2">
            <button onClick={() => { setOpen(false); setQuery(""); }} className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground rounded border border-border transition-colors">Cancel</button>
            <button onClick={() => { onChange(draft); setOpen(false); setQuery(""); }} className="px-3 py-1.5 text-[11px] font-medium text-primary-foreground bg-primary rounded hover:bg-primary/90 transition-colors">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Date filter inside analytics */
function AnalyticsDateFilter({ dateRange, onChange }: { dateRange: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const presets = getDatePresets();
  const activePreset = presets.find(p => dateRangesEqual(p, dateRange));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-[11px] font-medium text-foreground hover:bg-muted transition-all whitespace-nowrap">
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
          {formatDateCompact(dateRange)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <div className="flex">
          <div className="w-36 border-r border-border py-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => { onChange({ from: p.from, to: p.to }); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-[11px] hover:bg-muted transition-colors flex items-center justify-between",
                  activePreset?.label === p.label && "text-primary font-semibold bg-primary/5"
                )}
              >
                {p.label}
                {activePreset?.label === p.label && <Check className="w-3 h-3" />}
              </button>
            ))}
            <div className="border-t border-border mt-1 pt-1 px-3">
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Custom</span>
            </div>
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from) {
                  onChange({ from: startOfDay(range.from), to: startOfDay(range.to || range.from) });
                }
              }}
              numberOfMonths={1}
              className="p-2 pointer-events-auto"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Custom active shape for pie */
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx} cy={cy}
      innerRadius={innerRadius - 2}
      outerRadius={outerRadius + 4}
      startAngle={startAngle} endAngle={endAngle}
      fill={fill}
    />
  );
};

/** Label Analytics Section (TBC / GR / PSPP) */
const LabelAnalyticsSection = ({ title, data, field }: { title: string; data: HazardTask[]; field: "tbc" | "pspp" | "gr" }) => {
  const { pieData, tableData, finalCount, waitingCount } = useMemo(() => computeFinalDistribution(data, field), [data, field]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Sync hover between pie and table
  const pieIdx = hoveredRow !== null ? pieData.findIndex(d => d.name === hoveredRow) : activeIndex;

  if (data.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="text-[13px] font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-[11px] text-muted-foreground">Tidak ada label final pada rentang ini.</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        <InfoTip text="Distribusi berdasarkan label FINAL pada scope analytics saat ini." />
      </div>
      <p className="text-[10px] text-muted-foreground mb-4">Berdasarkan label FINAL pada scope · {finalCount} final, {waitingCount} menunggu</p>

      {finalCount === 0 ? (
        <p className="text-[11px] text-muted-foreground py-4">Tidak ada label final pada rentang ini.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Pie Chart */}
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  activeIndex={pieIdx !== null ? pieIdx : undefined}
                  activeShape={renderActiveShape}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.isOthers ? OTHERS_COLOR : PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(220,13%,91%)" }}
                  formatter={(value: number, name: string) => [`${value} (${data.length > 0 ? Math.round((value / data.length) * 100) : 0}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table breakdown */}
          <div className="max-h-[220px] overflow-auto scrollbar-thin border border-border rounded-lg">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Label</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground w-14">Jml</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground w-12">%</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr
                    key={row.name}
                    onMouseEnter={() => { setHoveredRow(row.name); }}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={cn(
                      "transition-colors cursor-pointer",
                      (hoveredRow === row.name || (pieIdx !== null && pieData[pieIdx]?.name === row.name))
                        ? "bg-primary/5"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <td className="px-3 py-1.5 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: pieData.find(p => p.name === row.name)?.isOthers ? OTHERS_COLOR : PIE_COLORS[pieData.findIndex(p => p.name === row.name) % PIE_COLORS.length] }}
                      />
                      <span className="truncate max-w-[160px]">{row.name}</span>
                    </td>
                    <td className="text-right px-3 py-1.5 font-medium">{row.value}</td>
                    <td className="text-right px-3 py-1.5 text-muted-foreground">{row.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────
const AnalyticsDrawer = ({ open, onClose, allData, filteredData, dateRange, filters, onApplyToPage }: AnalyticsDrawerProps) => {
  // Drawer's own filters (independent from page)
  const [drawerDate, setDrawerDate] = useState<DateRange>(dateRange);
  const [drawerFilters, setDrawerFilters] = useState<ColumnFilters>(emptyFilters);

  // Sync when opening
  useEffect(() => {
    if (open) {
      setDrawerDate(dateRange);
      setDrawerFilters(emptyFilters);
    }
  }, [open]);

  // Filter options from allData
  const filterOptions = useMemo(() => {
    const unique = (arr: string[]) => [...new Set(arr.filter(Boolean))].sort();
    return {
      sites: unique(allData.map(h => h.site)),
      lokasi: unique(allData.map(h => h.lokasi)),
      detail_location: unique(allData.map(h => h.detail_location)),
      ketidaksesuaian: unique(allData.map(h => h.ketidaksesuaian)),
      sub_ketidaksesuaian: unique(allData.map(h => h.sub_ketidaksesuaian)),
    };
  }, [allData]);

  // Compute analytics data using drawer's own filters
  const analyticsData = useMemo(() => {
    return allData.filter(h => {
      if (drawerFilters.site.length && !drawerFilters.site.includes(h.site)) return false;
      if (drawerFilters.lokasi.length && !drawerFilters.lokasi.includes(h.lokasi)) return false;
      if (drawerFilters.detail_location.length && !drawerFilters.detail_location.includes(h.detail_location)) return false;
      if (drawerFilters.ketidaksesuaian.length && !drawerFilters.ketidaksesuaian.includes(h.ketidaksesuaian)) return false;
      if (drawerFilters.sub_ketidaksesuaian.length && !drawerFilters.sub_ketidaksesuaian.includes(h.sub_ketidaksesuaian)) return false;
      return true;
    });
  }, [allData, drawerFilters]);

  // Scorecards
  const scorecards = useMemo(() => {
    const d = analyticsData;
    const fields: ("tbc" | "pspp" | "gr")[] = ["tbc", "pspp", "gr"];

    let totalWaiting = 0, totalFinal = 0;
    const perField: Record<string, { final: number; waiting: number }> = { tbc: { final: 0, waiting: 0 }, pspp: { final: 0, waiting: 0 }, gr: { final: 0, waiting: 0 } };

    for (const h of d) {
      let anyWaiting = false;
      for (const f of fields) {
        if (isFinal(h[f])) {
          perField[f].final++;
        } else {
          perField[f].waiting++;
          anyWaiting = true;
        }
      }
      if (anyWaiting) totalWaiting++; else totalFinal++;
    }

    return {
      total: d.length,
      totalWaiting,
      totalFinal,
      tbc: perField.tbc,
      pspp: perField.pspp,
      gr: perField.gr,
    };
  }, [analyticsData]);

  const isFilterDifferent = !dateRangesEqual(drawerDate, dateRange) || !filtersEqual(drawerFilters, { ...emptyFilters, ...filters });
  const hasDrawerFilters = Object.values(drawerFilters).some(arr => arr.length > 0) || !dateRangesEqual(drawerDate, dateRange);

  const handleReset = () => {
    setDrawerDate(dateRange);
    setDrawerFilters(emptyFilters);
  };

  const handleApply = () => {
    if (onApplyToPage) {
      onApplyToPage(drawerDate, drawerFilters);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop - subtle */}
      <div className="fixed inset-0 bg-foreground/8 z-40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Wide Drawer */}
      <div className="fixed top-0 right-0 h-full w-[55vw] max-w-[960px] min-w-[640px] bg-background border-l border-border z-50 shadow-2xl flex flex-col animate-slide-in-right">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Analytics</h2>
              <p className="text-[10px] text-muted-foreground">Label distribution & final counts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV(analyticsData)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* ── Sticky Filter Bar ── */}
        <div className="px-6 py-3 border-b border-border bg-card shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date filter */}
            <AnalyticsDateFilter dateRange={drawerDate} onChange={setDrawerDate} />

            <div className="h-5 w-px bg-border shrink-0" />

            {/* Global filters */}
            <AnalyticsMultiSelect label="Site" options={filterOptions.sites} selected={drawerFilters.site} onChange={(v) => setDrawerFilters(prev => ({ ...prev, site: v }))} />
            <AnalyticsMultiSelect label="Lokasi" options={filterOptions.lokasi} selected={drawerFilters.lokasi} onChange={(v) => setDrawerFilters(prev => ({ ...prev, lokasi: v }))} />
            <AnalyticsMultiSelect label="Detail Lokasi" options={filterOptions.detail_location} selected={drawerFilters.detail_location} onChange={(v) => setDrawerFilters(prev => ({ ...prev, detail_location: v }))} />
            <AnalyticsMultiSelect label="Ketidaksesuaian" options={filterOptions.ketidaksesuaian} selected={drawerFilters.ketidaksesuaian} onChange={(v) => setDrawerFilters(prev => ({ ...prev, ketidaksesuaian: v }))} />
            <AnalyticsMultiSelect label="Sub Ketidaksesuaian" options={filterOptions.sub_ketidaksesuaian} selected={drawerFilters.sub_ketidaksesuaian} onChange={(v) => setDrawerFilters(prev => ({ ...prev, sub_ketidaksesuaian: v }))} />

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action buttons */}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={handleApply}
              disabled={!isFilterDifferent}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[11px] font-semibold transition-all",
                isFilterDifferent
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <ArrowRightToLine className="w-3.5 h-3.5" />
              Apply to Page
            </button>
          </div>

          {/* Status indicator */}
          {isFilterDifferent && (
            <p className="mt-2 text-[10px] text-status-progress font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-progress animate-pulse" />
              Filter analytics berbeda dari halaman utama — klik "Apply to Page" untuk menerapkan.
            </p>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
          {analyticsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">Tidak ada data pada rentang ini</p>
              <p className="text-[11px] mt-1">Coba ubah filter atau rentang tanggal</p>
            </div>
          ) : (
            <>
              {/* Section 1: Scorecards */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <Scorecard
                  label="Total Hazard"
                  value={scorecards.total}
                  waiting={scorecards.totalWaiting}
                  finalVal={scorecards.totalFinal}
                  tip="Menghitung label FINAL pada scope analytics. Total hazard dalam rentang waktu dan filter yang dipilih."
                />
                <Scorecard
                  label="Total TBC"
                  value={scorecards.tbc.final + scorecards.tbc.waiting}
                  waiting={scorecards.tbc.waiting}
                  finalVal={scorecards.tbc.final}
                  tip="Menghitung label FINAL TBC pada scope analytics."
                />
                <Scorecard
                  label="Total GR"
                  value={scorecards.gr.final + scorecards.gr.waiting}
                  waiting={scorecards.gr.waiting}
                  finalVal={scorecards.gr.final}
                  tip="Menghitung label FINAL GR pada scope analytics."
                />
                <Scorecard
                  label="Total PSPP"
                  value={scorecards.pspp.final + scorecards.pspp.waiting}
                  waiting={scorecards.pspp.waiting}
                  finalVal={scorecards.pspp.final}
                  tip="Menghitung label FINAL PSPP pada scope analytics."
                />
              </div>

              {/* Divider */}
              <div className="border-t border-border mb-8" />

              {/* Section 2: TBC / GR / PSPP */}
              <LabelAnalyticsSection title="TBC Analytics" data={analyticsData} field="tbc" />
              <LabelAnalyticsSection title="GR Analytics" data={analyticsData} field="gr" />
              <LabelAnalyticsSection title="PSPP Analytics" data={analyticsData} field="pspp" />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AnalyticsDrawer;
