import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, BarChart3, Info, Search, ChevronDown, CalendarDays, RotateCcw, ArrowRightToLine, Check, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
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
  "hsl(var(--primary))",
  "hsl(152, 45%, 42%)",
  "hsl(38, 62%, 50%)",
  "hsl(0, 52%, 52%)",
  "hsl(270, 38%, 54%)",
  "hsl(180, 42%, 44%)",
  "hsl(330, 45%, 50%)",
  "hsl(200, 44%, 50%)",
];

const OTHERS_COLOR = "hsl(var(--muted-foreground) / 0.3)";

// ─── Helpers ────────────────────────────────────────────────
function isFinal(label: AILabel): boolean {
  return label.locked || label.auto_confirmed;
}

function getFinalLabel(label: AILabel): string | null {
  if (!isFinal(label)) return null;
  return label.human_label || label.ai_label || null;
}

function getDatePresets(): DatePreset[] {
  const today = startOfDay(new Date());
  return [
    { label: "Hari ini", from: today, to: today },
    { label: "1 hari lalu", from: subDays(today, 1), to: subDays(today, 1) },
    { label: "2 hari lalu", from: subDays(today, 2), to: subDays(today, 2) },
    { label: "3 hari lalu", from: subDays(today, 3), to: subDays(today, 3) },
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

  if (waitingCount > 0) {
    labelMap.set(`Non-${fieldName}`, waitingCount);
  }

  const sorted = [...labelMap.entries()].sort((a, b) => b[1] - a[1]);

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

// ─── Sub-components ─────────────────────────────────────────

/** Ratio bar: Waiting vs Final — Mixpanel style */
const RatioBar = ({ waiting, final: finalVal }: { waiting: number; final: number }) => {
  const total = waiting + finalVal;
  if (total === 0) return null;
  const finalPct = (finalVal / total) * 100;
  const waitingPct = (waiting / total) * 100;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mt-3 space-y-1.5">
            <div className="flex h-[6px] rounded-full overflow-hidden bg-secondary">
              {waitingPct > 0 && (
                <div
                  className="h-full transition-all duration-500 rounded-l-full"
                  style={{ width: `${waitingPct}%`, backgroundColor: "hsl(var(--muted-foreground) / 0.25)" }}
                />
              )}
              {finalPct > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${finalPct}%`,
                    backgroundColor: "hsl(var(--primary))",
                    borderRadius: waitingPct === 0 ? "9999px" : "0 9999px 9999px 0",
                  }}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                Menunggu <span className="font-semibold text-foreground">{waiting}</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                Final <span className="font-semibold text-foreground">{finalVal}</span>
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-[11px] p-3 space-y-1">
          <p className="font-semibold text-foreground">Definisi Status</p>
          <p className="text-muted-foreground"><strong className="text-foreground">Menunggu</strong> — belum final (AI predicted / pending review)</p>
          <p className="text-muted-foreground"><strong className="text-foreground">Final</strong> — sudah dikonfirmasi (human / auto-confirm)</p>
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
        <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help shrink-0 hover:text-muted-foreground transition-colors" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-[11px]">
        {text}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/** Scorecard — Mixpanel enterprise style */
const Scorecard = ({ label, value, waiting, finalVal, tip, accent }: {
  label: string; value: number; waiting: number; finalVal: number; tip: string; accent?: string;
}) => (
  <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow duration-200">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">{label}</span>
      <InfoTip text={tip} />
    </div>
    <div className="flex items-end gap-2">
      <span className="text-3xl font-bold text-foreground leading-none tracking-tight">{value}</span>
      {finalVal > 0 && (
        <span className="text-[10px] font-medium text-primary mb-1 flex items-center gap-0.5">
          <TrendingUp className="w-3 h-3" />
          {Math.round((finalVal / (waiting + finalVal)) * 100)}% final
        </span>
      )}
    </div>
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
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-medium transition-all whitespace-nowrap",
          hasSelected
            ? "border-primary/40 bg-primary/5 text-primary shadow-sm"
            : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        {label}{hasSelected && ` (${selected.length})`}
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-[70] bg-popover border border-border rounded-xl shadow-xl w-64 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text" placeholder={`Cari ${label.toLowerCase()}...`}
                value={query} onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[11px] bg-secondary/50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-auto py-1 scrollbar-thin">
            {filteredOptions.length === 0 && <p className="px-3 py-3 text-[11px] text-muted-foreground text-center">Tidak ada hasil</p>}
            {filteredOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2.5 px-3 py-2 text-[11px] hover:bg-secondary/60 cursor-pointer transition-colors">
                <div className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0",
                  draft.includes(opt)
                    ? "bg-primary border-primary"
                    : "border-border bg-background"
                )}>
                  {draft.includes(opt) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
                <input type="checkbox" checked={draft.includes(opt)} onChange={() => setDraft(prev => prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt])} className="sr-only" />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
          <div className="px-3 py-2.5 border-t border-border flex items-center justify-between">
            <button
              onClick={() => setDraft([])}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => { setOpen(false); setQuery(""); }} className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground rounded-lg transition-colors">Batal</button>
              <button onClick={() => { onChange(draft); setOpen(false); setQuery(""); }} className="px-4 py-1.5 text-[11px] font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors">Terapkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Date filter inside analytics — matches main page scheme */
function AnalyticsDateFilter({ dateRange, onChange }: { dateRange: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(dateRange.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(dateRange.to);
  const presets = getDatePresets();
  const activePreset = presets.find(p => dateRangesEqual(p, dateRange));
  const isCustom = !activePreset;

  const handlePreset = (p: DatePreset) => {
    onChange({ from: p.from, to: p.to });
    setOpen(false);
    setShowCustom(false);
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      const from = customFrom < customTo ? customFrom : customTo;
      const to = customFrom < customTo ? customTo : customFrom;
      onChange({ from: startOfDay(from), to: startOfDay(to) });
      setOpen(false);
      setShowCustom(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all",
          "border-border bg-card text-foreground hover:shadow-sm hover:border-foreground/20",
          activePreset && "border-primary/30"
        )}>
          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={cn("font-semibold", activePreset ? "text-primary" : "text-foreground")}>
            {activePreset ? activePreset.label : "Custom"}
          </span>
          <span className="text-muted-foreground text-[10px]">{formatDateCompact(dateRange)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border-border" align="start" sideOffset={6}>
        <div className="flex">
          {/* Presets */}
          <div className="py-2 min-w-[180px]">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className={cn(
                  "flex items-center justify-between w-full px-4 py-2.5 text-left transition-colors",
                  activePreset?.label === p.label ? "bg-primary/5" : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className={cn("w-4 h-4", activePreset?.label === p.label ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <div className={cn("text-sm font-medium", activePreset?.label === p.label ? "text-primary" : "text-foreground")}>{p.label}</div>
                    <div className="text-[11px] text-muted-foreground">{format(p.from, "dd MMM yyyy", { locale: localeId })}</div>
                  </div>
                </div>
                {activePreset?.label === p.label && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            {/* Custom */}
            <button
              onClick={() => { setShowCustom(true); setCustomFrom(dateRange.from); setCustomTo(dateRange.to); }}
              className={cn(
                "flex items-center w-full px-4 py-2.5 text-left transition-colors border-t border-border",
                isCustom ? "bg-primary/5" : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <CalendarDays className={cn("w-4 h-4", isCustom ? "text-primary" : "text-muted-foreground")} />
                <div className={cn("text-sm font-medium", isCustom ? "text-primary" : "text-foreground")}>Custom…</div>
              </div>
            </button>
            {/* Timezone */}
            <div className="px-4 pt-3 pb-1 border-t border-border mt-1">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>WIB (UTC+7)</span>
              </div>
            </div>
          </div>
          {/* Custom calendar */}
          {showCustom && (
            <div className="p-3 border-l border-border">
              <p className="text-xs font-semibold text-foreground mb-2">Pilih Rentang Tanggal</p>
              <div className="flex gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Dari</p>
                  <Calendar mode="single" selected={customFrom} onSelect={(d) => d && setCustomFrom(d)} className="p-2 pointer-events-auto" initialFocus />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Sampai</p>
                  <Calendar mode="single" selected={customTo} onSelect={(d) => d && setCustomTo(d)} className="p-2 pointer-events-auto" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowCustom(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Batal</button>
                <button onClick={applyCustom} disabled={!customFrom || !customTo} className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full transition-colors hover:bg-primary/90 disabled:opacity-40">Terapkan</button>
              </div>
            </div>
          )}
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
      outerRadius={outerRadius + 5}
      startAngle={startAngle} endAngle={endAngle}
      fill={fill}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
    />
  );
};

/** Label Analytics Section (TBC / GR / PSPP) — Mixpanel style */
const LabelAnalyticsSection = ({ title, data, field }: { title: string; data: HazardTask[]; field: "tbc" | "pspp" | "gr" }) => {
  const { pieData, tableData, finalCount, waitingCount } = useMemo(() => computeFinalDistribution(data, field), [data, field]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const pieIdx = hoveredRow !== null ? pieData.findIndex(d => d.name === hoveredRow) : activeIndex;

  if (data.length === 0) {
    return (
      <div className="mb-8 bg-card rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-[11px] text-muted-foreground">Tidak ada data pada rentang ini.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-card rounded-xl border border-border overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <InfoTip text="Distribusi berdasarkan label FINAL pada scope analytics saat ini." />
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <span className="font-semibold text-foreground">{finalCount}</span> final
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="font-semibold text-foreground">{waitingCount}</span> menunggu
            </span>
          </div>
        </div>
      </div>

      {finalCount === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-[11px] text-muted-foreground">Tidak ada label final pada rentang ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_1.2fr] gap-0">
          {/* Pie Chart */}
          <div className="p-6 flex items-center justify-center border-r border-border">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={82}
                    dataKey="value"
                    activeIndex={pieIdx !== null ? pieIdx : undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    strokeWidth={2}
                    stroke="hsl(var(--card))"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.isOthers ? OTHERS_COLOR : PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 10,
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                      boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)",
                    }}
                    formatter={(value: number, name: string) => [`${value} (${data.length > 0 ? Math.round((value / data.length) * 100) : 0}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table breakdown */}
          <div className="overflow-hidden">
            <div className="max-h-[260px] overflow-auto scrollbar-thin">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-secondary/60 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Label</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-16">Jumlah</th>
                    <th className="text-right px-5 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-16">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => {
                    const isActive = hoveredRow === row.name || (pieIdx !== null && pieData[pieIdx]?.name === row.name);
                    const colorIdx = pieData.findIndex(p => p.name === row.name);
                    const dotColor = pieData.find(p => p.name === row.name)?.isOthers
                      ? OTHERS_COLOR
                      : PIE_COLORS[colorIdx % PIE_COLORS.length];
                    return (
                      <tr
                        key={row.name}
                        onMouseEnter={() => setHoveredRow(row.name)}
                        onMouseLeave={() => setHoveredRow(null)}
                        className={cn(
                          "transition-colors cursor-pointer border-b border-border/50 last:border-0",
                          isActive ? "bg-primary/5" : "hover:bg-secondary/40"
                        )}
                      >
                        <td className="px-5 py-2.5 flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-background"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="truncate max-w-[180px] font-medium text-foreground">{row.name}</span>
                        </td>
                        <td className="text-right px-4 py-2.5 font-bold text-foreground">{row.value}</td>
                        <td className="text-right px-5 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
                            {row.pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────
const AnalyticsDrawer = ({ open, onClose, allData, filteredData, dateRange, filters, onApplyToPage }: AnalyticsDrawerProps) => {
  const [drawerDate, setDrawerDate] = useState<DateRange>(dateRange);
  const [drawerFilters, setDrawerFilters] = useState<ColumnFilters>(emptyFilters);

  useEffect(() => {
    if (open) {
      setDrawerDate(dateRange);
      setDrawerFilters(emptyFilters);
    }
  }, [open]);

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

  const scorecards = useMemo(() => {
    const d = analyticsData;
    const fields: ("tbc" | "pspp" | "gr")[] = ["tbc", "pspp", "gr"];

    let totalWaiting = 0, totalFinal = 0;
    const perField: Record<string, { final: number; waiting: number }> = {
      tbc: { final: 0, waiting: 0 },
      pspp: { final: 0, waiting: 0 },
      gr: { final: 0, waiting: 0 },
    };

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

    return { total: d.length, totalWaiting, totalFinal, tbc: perField.tbc, pspp: perField.pspp, gr: perField.gr };
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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/6 z-40" onClick={onClose} />

      {/* Wide Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-[52vw] max-w-[920px] min-w-[600px] bg-background z-50 flex flex-col"
        style={{
          boxShadow: "-8px 0 40px hsl(var(--foreground) / 0.08), -1px 0 0 hsl(var(--border))",
          animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Analytics</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Distribusi label & metrik evaluasi</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Sticky Filter Bar ── */}
        <div className="px-7 py-3.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <AnalyticsDateFilter dateRange={drawerDate} onChange={setDrawerDate} />
            <div className="h-5 w-px bg-border shrink-0" />
            <AnalyticsMultiSelect label="Site" options={filterOptions.sites} selected={drawerFilters.site} onChange={(v) => setDrawerFilters(prev => ({ ...prev, site: v }))} />
            <AnalyticsMultiSelect label="Lokasi" options={filterOptions.lokasi} selected={drawerFilters.lokasi} onChange={(v) => setDrawerFilters(prev => ({ ...prev, lokasi: v }))} />
            <AnalyticsMultiSelect label="Detail Lokasi" options={filterOptions.detail_location} selected={drawerFilters.detail_location} onChange={(v) => setDrawerFilters(prev => ({ ...prev, detail_location: v }))} />
            <AnalyticsMultiSelect label="Ketidaksesuaian" options={filterOptions.ketidaksesuaian} selected={drawerFilters.ketidaksesuaian} onChange={(v) => setDrawerFilters(prev => ({ ...prev, ketidaksesuaian: v }))} />

            <div className="flex-1" />

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <button
              onClick={handleApply}
              disabled={!isFilterDifferent}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                isFilterDifferent
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              <ArrowRightToLine className="w-3.5 h-3.5" />
              Apply to Page
            </button>
          </div>

          {isFilterDifferent && (
            <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 border border-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-status-progress animate-pulse" />
              <p className="text-[10px] text-accent-foreground font-medium">
                Filter analytics berbeda dari halaman utama — klik "Apply to Page" untuk menerapkan.
              </p>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6 scrollbar-thin bg-secondary/20">
          {analyticsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mb-3 opacity-15" />
              <p className="text-sm font-semibold text-foreground">Tidak ada data</p>
              <p className="text-[11px] mt-1">Coba ubah filter atau rentang tanggal</p>
            </div>
          ) : (
            <>
              {/* Section 1: Scorecards */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                <Scorecard
                  label="Total Hazard" value={scorecards.total}
                  waiting={scorecards.totalWaiting} finalVal={scorecards.totalFinal}
                  tip="Total hazard dalam rentang waktu dan filter yang dipilih."
                />
                <Scorecard
                  label="Total TBC" value={scorecards.tbc.final + scorecards.tbc.waiting}
                  waiting={scorecards.tbc.waiting} finalVal={scorecards.tbc.final}
                  tip="Menghitung label TBC pada scope analytics."
                />
                <Scorecard
                  label="Total GR" value={scorecards.gr.final + scorecards.gr.waiting}
                  waiting={scorecards.gr.waiting} finalVal={scorecards.gr.final}
                  tip="Menghitung label GR pada scope analytics."
                />
                <Scorecard
                  label="Total PSPP" value={scorecards.pspp.final + scorecards.pspp.waiting}
                  waiting={scorecards.pspp.waiting} finalVal={scorecards.pspp.final}
                  tip="Menghitung label PSPP pada scope analytics."
                />
              </div>

              {/* Section 2: TBC / GR / PSPP */}
              <LabelAnalyticsSection title="TBC Analytics" data={analyticsData} field="tbc" />
              <LabelAnalyticsSection title="GR Analytics" data={analyticsData} field="gr" />
              <LabelAnalyticsSection title="PSPP Analytics" data={analyticsData} field="pspp" />
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default AnalyticsDrawer;
