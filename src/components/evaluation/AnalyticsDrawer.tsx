import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, BarChart3, Info, Search, ChevronDown, ChevronUp, CalendarDays, RotateCcw, ArrowRightToLine, Check, TrendingUp, Clock, CheckCircle2, LayoutDashboard, History, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Activity, Brain, UserCheck } from "lucide-react";
import { HazardTask, AILabel } from "@/types/hazard";
import { ColumnFilters, emptyFilters } from "./FilterBar";
import { DateRange } from "./DateFilter";
import { format, startOfDay, subDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { mockDailyRecaps, DailyRecap } from "@/data/mockDailyRecaps";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Sector,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ComposedChart, Bar, Area
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
  "hsl(var(--primary))",     // Enterprise Green 
  "hsl(161, 70%, 25%)",      // Deep Forest
  "hsl(155, 60%, 45%)",      // Sea Green
  "hsl(168, 80%, 35%)",      // Rich Emerald
  "hsl(142, 45%, 52%)",      // Grass Green
  "hsl(175, 60%, 40%)",      // Dark Teal
  "hsl(185, 55%, 45%)",      // Ocean Green
  "hsl(150, 40%, 65%)",      // Minty Sage
  "hsl(165, 50%, 30%)",      // Charcoal Green
  "hsl(180, 42%, 44%)",      // Cyan
  "hsl(38, 62%, 50%)",       // Balanced Gold (Contextual)
  "hsl(158, 62%, 52%)",      // Emerald Glow
  "hsl(165, 38%, 54%)",      // Sage Dust
  "hsl(172, 30%, 45%)",      // Petrol Green
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

function getAnalyticsDatePresets(): DatePreset[] {
  const today = startOfDay(new Date());
  return [
    { label: "Hari ini", from: today, to: today },
    { label: "1 hari lalu", from: subDays(today, 1), to: subDays(today, 1) },
    { label: "2 hari lalu", from: subDays(today, 2), to: subDays(today, 2) },
    { label: "3 hari lalu", from: subDays(today, 3), to: subDays(today, 3) },
    { label: "4 hari lalu", from: subDays(today, 4), to: subDays(today, 4) },
    { label: "5 hari lalu", from: subDays(today, 5), to: subDays(today, 5) },
    { label: "6 hari lalu", from: subDays(today, 6), to: subDays(today, 6) },
    { label: "7 hari lalu", from: subDays(today, 7), to: subDays(today, 7) },
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

function computeFinalDistribution(_data: HazardTask[], field: "tbc" | "pspp" | "gr") {
  const fieldName = field.toUpperCase();

  // Hardcoded dummy distributions
  const dummyDistributions: Record<string, { labels: [string, number][]; finalCount: number; waitingCount: number; total: number }> = {
    tbc: {
      labels: [
        ["1. Deviasi Prosedur", 52],
        ["2. Housekeeping", 38],
        ["8. Deviasi Road Safety", 28],
        ["5. Deviasi Prosedur", 22],
        ["6. Pengamanan", 18],
        ["9. Kesesuaian", 12],
        ["10. Tools Tidak Layak", 10],
        ["Non-TBC", 30],
      ],
      finalCount: 180, waitingCount: 30, total: 210,
    },
    gr: {
      labels: [
        ["3. Geotech & Geologi", 25],
        ["4. Posisi Pekerja", 18],
        ["7. LOTO", 12],
        ["11. Bahaya Elektrikal", 10],
        ["13. Aktivitas Drilling", 10],
        ["Non-GR", 15],
      ],
      finalCount: 75, waitingCount: 15, total: 90,
    },
    pspp: {
      labels: [
        ["12. Bahaya Kebakaran", 14],
        ["14. Technology", 10],
        ["15. Deviasi Lainnya", 8],
        ["2. Housekeeping", 8],
        ["Non-PSPP", 10],
      ],
      finalCount: 40, waitingCount: 10, total: 50,
    },
  };

  const dist = dummyDistributions[field];
  const sorted = dist.labels;

  const MAX_SLICES = 7;
  let pieData: { name: string; value: number; isOthers?: boolean }[];
  if (sorted.length <= MAX_SLICES) {
    pieData = sorted.map(([name, value]) => ({ name, value }));
  } else {
    const top = sorted.slice(0, MAX_SLICES - 1);
    const othersSum = sorted.slice(MAX_SLICES - 1).reduce((s, [, v]) => s + (v as number), 0);
    pieData = [
      ...top.map(([name, value]) => ({ name: name as string, value: value as number })),
      { name: "Others", value: othersSum, isOthers: true },
    ];
  }

  const tableData = sorted.map(([name, value]) => ({
    name: name as string,
    value: value as number,
    pct: dist.total > 0 ? Math.round(((value as number) / dist.total) * 100) : 0,
  }));

  return { pieData, tableData, finalCount: dist.finalCount, waitingCount: dist.waitingCount, total: dist.total };
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
function AnalyticsDateFilter({ 
  dateRange, 
  onChange, 
  mode 
}: { 
  dateRange: DateRange; 
  onChange: (r: DateRange) => void;
  mode: "daily" | "weekly";
}) {
  const [open, setOpen] = useState(false);
  const presets = getAnalyticsDatePresets();
  const activePreset = presets.find(p => dateRangesEqual(p, dateRange));

  const handlePreset = (p: DatePreset) => {
    onChange({ from: p.from, to: p.to });
    setOpen(false);
  };

  // Weekly selector state
  const [tempMonth, setTempMonth] = useState<Date>(startOfMonth(dateRange.from));
  const [selectionStep, setSelectionStep] = useState<"month" | "week">("month");

  useEffect(() => {
    if (mode === "weekly") setSelectionStep("month");
  }, [mode, open]);

  const monthsList = useMemo(() => {
    const list = [];
    const base = new Date(2026, 0, 1);
    for (let i = 0; i < 12; i++) {
      list.push(startOfMonth(subDays(base, -i * 30)));
    }
    // Just months in current repo data scope
    return [
      new Date(2026, 2, 1), // March
      new Date(2026, 3, 1), // April
    ];
  }, []);

  const weeksInMonth = useMemo(() => {
    const start = startOfMonth(tempMonth);
    const end = endOfMonth(tempMonth);
    const days = eachDayOfInterval({ start, end });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push({
        from: days[i],
        to: days[Math.min(i + 6, days.length - 1)],
        label: `Week ${Math.ceil((i + 1) / 7)}`
      });
    }
    return weeks;
  }, [tempMonth]);

  const handleMonthChoice = (m: Date) => {
    setTempMonth(m);
    setSelectionStep("week");
  };

  const handleWeekChoice = (w: { from: Date; to: Date }) => {
    onChange({ from: w.from, to: w.to });
    setOpen(false);
  };
  const displayLabel = useMemo(() => {
    if (mode === "daily") {
      return activePreset ? activePreset.label : formatDateCompact(dateRange);
    }
    return `Week ${Math.ceil((dateRange.from.getDate()) / 7)} — ${format(dateRange.from, "MMM yyyy")}`;
  }, [mode, dateRange, activePreset]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all shadow-xs",
          "border-border bg-card text-foreground hover:shadow-sm hover:border-foreground/20",
          (activePreset || mode !== "daily") && "border-primary/30"
        )}>
          {mode === "daily" ? <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> : <CalendarIcon className="w-3.5 h-3.5 text-primary" />}
          <span className={cn("font-bold tracking-tight", mode !== "daily" || activePreset ? "text-primary" : "text-foreground")}>
            {displayLabel}
          </span>
          {mode === "daily" && <span className="text-muted-foreground text-[10px] font-bold opacity-60 ml-1">{formatDateCompact(dateRange)}</span>}
          <ChevronDown className="w-3 h-3 text-muted-foreground opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border overflow-hidden" align="start" sideOffset={6}>
        <div className="py-2 min-w-[220px] max-h-[400px] overflow-auto">
          {mode === "daily" && (
            <div className="space-y-0.5">
              <div className="px-4 py-2 mb-1 border-b border-border/50 bg-muted/10">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Select Daily Range</span>
              </div>
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
                      <div className={cn("text-[11px] font-bold", activePreset?.label === p.label ? "text-primary" : "text-foreground")}>{p.label}</div>
                      <div className="text-[10px] text-muted-foreground font-medium">{format(p.from, "dd MMM yyyy", { locale: localeId })}</div>
                    </div>
                  </div>
                  {activePreset?.label === p.label && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}

          {/* Monthly mode removed */}

          {mode === "weekly" && (
            <div className="space-y-0.5">
              {selectionStep === "month" ? (
                <>
                  <div className="px-4 py-2 mb-1 border-b border-border/50 bg-muted/10">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Step 1: Choose Month</span>
                  </div>
                  {monthsList.map(m => (
                    <button
                      key={m.toISOString()}
                      onClick={() => handleMonthChoice(m)}
                      className="flex items-center justify-between w-full px-5 py-2.5 text-left hover:bg-muted transition-colors group"
                    >
                      <span className="text-[11px] font-bold">{format(m, "MMMM yyyy", { locale: localeId })}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setSelectionStep("month")}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-primary hover:bg-primary/5 w-full uppercase tracking-widest border-b border-border/50"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back to Months
                  </button>
                  <div className="px-5 py-3 border-b border-border/30">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{format(tempMonth, "MMMM yyyy")}</span>
                  </div>
                  {weeksInMonth.map(w => (
                    <button
                      key={w.label}
                      onClick={() => handleWeekChoice(w)}
                      className={cn(
                        "flex items-center justify-between w-full px-5 py-2.5 text-left hover:bg-muted transition-colors",
                        isSameDay(w.from, dateRange.from) && "bg-primary/5 text-primary"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-tight">{w.label}</span>
                        <span className="text-[10px] text-muted-foreground">{format(w.from, "dd MMM")} – {format(w.to, "dd MMM")}</span>
                      </div>
                      {isSameDay(w.from, dateRange.from) && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Timezone & Footer */}
          <div className="px-4 pt-3 pb-2 border-t border-border mt-1.5 bg-muted/5">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              <span>GTM+7 Operations</span>
            </div>
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
      outerRadius={outerRadius + 5}
      startAngle={startAngle} endAngle={endAngle}
      fill={fill}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
    />
  );
};

/** Label Analytics Section (TBC / GR / PSPP) — Mixpanel style */
const LabelAnalyticsSection = ({ 
  title, 
  data, 
  field,
  customData,
  trendData
}: { 
  title: string; 
  data?: HazardTask[]; 
  field: "tbc" | "pspp" | "gr";
  customData?: { 
    pieData: any[]; 
    tableData: any[]; 
    finalCount: number; 
    waitingCount: number; 
    total: number;
  },
  trendData?: any[];
}) => {
  const computed = useMemo(() => {
    if (customData) return customData;
    return computeFinalDistribution(data || [], field);
  }, [data, field, customData]);

  const [activeTab, setActiveTab] = useState<"overview" | "trend">("overview");
  const { pieData, tableData, finalCount, waitingCount, total } = computed;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // For interactive Trend Legend
  const [hiddenLines, setHiddenLines] = useState<string[]>([]);
  const toggleLine = (name: string) => {
    setHiddenLines(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const pieIdx = hoveredRow !== null ? pieData.findIndex(d => d.name === hoveredRow) : activeIndex;
  const fieldLabel = field.toUpperCase();

  if (!customData && (!data || data.length === 0)) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground mb-2 tracking-tight uppercase">{title}</h3>
        <p className="text-[11px] text-muted-foreground">Tidak ada data untuk scope ini.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
            <div className="flex flex-col">
              <h3 className="text-[12px] font-black text-foreground tracking-tight uppercase leading-none">{title}</h3>
              <span className="text-[9px] text-muted-foreground mt-1 font-bold">Standard Intelligence Breakdown</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {trendData && (
               <div className="flex p-0.5 bg-muted/40 rounded-lg border border-border/60">
                 <button 
                   onClick={() => setActiveTab("overview")}
                   className={cn(
                     "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-tight transition-all",
                     activeTab === "overview" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                   )}
                 >
                   Distribution
                 </button>
                 <button 
                   onClick={() => setActiveTab("trend")}
                   className={cn(
                     "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-tight transition-all",
                     activeTab === "trend" ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
                   )}
                 >
                   Analysis Graph
                 </button>
               </div>
             )}
             <div className="h-5 w-px bg-border/60" />
             <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-tight">
             <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-lg border border-border/60">
               <div className="flex items-center gap-1.5 px-2 py-0.5 text-muted-foreground">
                 <CheckCircle2 className="w-3 h-3 text-primary" />
                 <span className="text-foreground tracking-tighter tabular-nums">{finalCount}</span>
                 <span className="opacity-40">FINAL</span>
               </div>
               <div className="w-px h-3 bg-border/80" />
               <div className="flex items-center gap-1.5 px-2 py-0.5 text-muted-foreground">
                 <Clock className="w-3 h-3 text-status-progress" />
                 <span className="text-foreground tracking-tighter tabular-nums">{waitingCount}</span>
                 <span className="opacity-40">MENUNGGU</span>
               </div>
             </div>
             </div>
          </div>
        </div>
      </div>

      {activeTab === "overview" ? (
        <>
          {finalCount === 0 && tableData.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-[11px] text-muted-foreground font-medium italic">Tidak ada label distribusi yang ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_1.1fr]">
              {/* Pie Chart with center label */}
              <div className="p-8 flex items-center justify-center border-r border-border bg-muted/5">
                <div className="h-[220px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={85}
                        dataKey="value"
                        activeIndex={pieIdx !== null ? pieIdx : undefined}
                        activeShape={renderActiveShape}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        strokeWidth={3}
                        stroke="hsl(var(--card))"
                        paddingAngle={2}
                      >
                        {pieData.map((entry, i) => (
                          <Cell 
                            key={i} 
                            fill={entry.isOthers ? OTHERS_COLOR : PIE_COLORS[i % PIE_COLORS.length]} 
                            className="outline-none transition-all duration-500"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload?.[0]) {
                            return (
                              <div className="bg-background/95 backdrop-blur-md border border-border px-3 py-2 rounded-xl shadow-2xl">
                                <p className="text-[10px] font-black text-foreground uppercase tracking-tight">{payload[0].name}</p>
                                <p className="text-[14px] font-black text-primary mt-0.5">
                                  {payload[0].value} <span className="text-[10px] text-muted-foreground">({Math.round((payload[0].value as number / total) * 100)}%)</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-foreground leading-none tracking-tighter">{total}</span>
                    <span className="text-[9px] font-bold text-muted-foreground mt-2 uppercase tracking-widest opacity-60">Total {fieldLabel}</span>
                  </div>
                </div>
              </div>

              {/* Table breakdown */}
              <div className="overflow-hidden bg-card">
                <div className="max-h-[300px] overflow-auto scrollbar-thin">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-card/90 backdrop-blur-md z-10">
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 font-black text-muted-foreground text-[9px] uppercase tracking-[0.2em] opacity-60">Label</th>
                        <th className="text-right px-4 py-3 font-black text-muted-foreground text-[9px] uppercase tracking-[0.2em] opacity-60 w-16">Total</th>
                        <th className="text-right px-6 py-3 font-black text-muted-foreground text-[9px] uppercase tracking-[0.2em] opacity-60 w-16">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
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
                              "transition-all cursor-pointer group/row",
                              isActive ? "bg-primary/5" : "hover:bg-muted/50"
                            )}
                          >
                            <td className="px-6 py-3 flex items-center gap-3">
                              <span className="text-[10px] font-black text-muted-foreground/40 tabular-nums w-4">{i + 1}.</span>
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-background shadow-sm"
                                style={{ backgroundColor: dotColor }}
                              />
                              <span className={cn(
                                "truncate max-w-[170px] font-bold uppercase tracking-tight transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground group-hover/row:text-foreground"
                              )}>
                                {row.name.replace(/^\d+\.\s*/, '')}
                              </span>
                            </td>
                            <td className="text-right px-4 py-3 font-black text-foreground tabular-nums">{row.value}</td>
                            <td className="text-right px-6 py-3">
                              <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tabular-nums transition-colors",
                                isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover/row:bg-border"
                              )}>
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
        </>
      ) : (
        <div className="bg-card flex flex-col p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 h-[520px]">
           {/* Enterprise Legend (Mixpanel Style) */}
           <div className="flex flex-wrap gap-x-6 gap-y-3 px-2">
              {tableData.map((l, i) => {
                const color = PIE_COLORS[i % PIE_COLORS.length];
                const isHidden = hiddenLines.includes(l.name);
                return (
                  <button 
                    key={l.name}
                    onClick={() => toggleLine(l.name)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-300",
                      isHidden 
                        ? "bg-transparent border-transparent opacity-40 grayscale" 
                        : "bg-secondary/40 border-border hover:shadow-xs group"
                    )}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                    <span className="text-[9px] font-black uppercase tracking-tight text-foreground/80 group-hover:text-primary transition-colors">
                      {l.name.replace(/^\d+\.\s*/, '')}
                    </span>
                  </button>
                )
              })}
           </div>

           <div className="flex-1 min-h-0 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                  <XAxis 
                    dataKey="dateLabel" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: "hsl(var(--foreground))" }}
                    dy={12}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: "hsl(var(--muted-foreground))" }}
                    domain={[0, 'auto']}
                  />
                  <RechartsTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          // Sort payload by value for better readability
                          const sortedPayload = [...payload].sort((a:any, b:any) => b.value - a.value);
                          return (
                            <div className="bg-background/95 backdrop-blur-md border border-border p-4 rounded-2xl shadow-3xl space-y-3 min-w-[220px]">
                               <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                  <p className="text-[10px] font-black text-foreground uppercase tracking-[0.1em]">{label}</p>
                                  <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40">Intelligence Snap</span>
                               </div>
                               <div className="space-y-2">
                                  {sortedPayload.map((p: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between gap-6 group">
                                       <div className="flex items-center gap-2.5 overflow-hidden">
                                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                                          <span className="text-[9px] font-bold text-foreground/80 uppercase truncate">
                                            {p.name.split(' ').slice(0, 3).join(' ')}
                                          </span>
                                       </div>
                                       <div className="flex items-center gap-1.5 shrink-0">
                                          <span className="text-[11px] font-black text-foreground tabular-nums">{p.value}%</span>
                                          <TrendingUp className="w-2.5 h-2.5 text-primary opacity-30" />
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                  />
                  {tableData.map((l, i) => (
                    <Line 
                      key={l.name}
                      type="monotone"
                      dataKey={l.name}
                      name={l.name.replace(/^\d+\.\s*/, '')}
                      stroke={PIE_COLORS[i % PIE_COLORS.length]}
                      strokeWidth={3.5}
                      dot={{ r: 4, strokeWidth: 2.5, fill: "hsl(var(--background))" }}
                      activeDot={{ r: 7, strokeWidth: 0, fill: PIE_COLORS[i % PIE_COLORS.length] }}
                      animationDuration={1800}
                      hide={hiddenLines.includes(l.name)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
           </div>
           
           <div className="flex items-center justify-between pt-4 border-t border-border/40">
             <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">
               <Activity className="w-3.5 h-3.5" />
               Daily Activity Correlation
             </div>
             <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-[0.15em] opacity-30 italic">Click series in legend to focus analysis</p>
           </div>
        </div>
      )}
    </div>
  );
};

// ─── Daily Recap Components ─────────────────────────────────

/** View Switcher — Segmented Control */
const ViewSwitcher = ({ view, onChange }: { view: "daily" | "weekly"; onChange: (v: "daily" | "weekly") => void }) => (
  <div className="flex p-1 bg-muted/30 rounded-xl border border-border w-fit shrink-0 backdrop-blur-sm shadow-inner">
    <button
      onClick={() => onChange("daily")}
      className={cn(
        "flex items-center gap-2 px-5 py-1.5 rounded-lg text-[11px] font-bold tracking-tight transition-all",
        view === "daily" ? "bg-card text-primary shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <LayoutDashboard className="w-3.5 h-3.5" />
      Daily
    </button>
    <button
      onClick={() => onChange("weekly")}
      className={cn(
        "flex items-center gap-2 px-5 py-1.5 rounded-lg text-[11px] font-bold tracking-tight transition-all",
        view === "weekly" ? "bg-card text-primary shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <CalendarIcon className="w-3.5 h-3.5" />
      Weekly
    </button>
  </div>
);

/** List mode view for Daily Recap — horizontal scroll or grid */
const DailyRecapGrid = ({ recaps, selectedDate, onSelect }: { recaps: DailyRecap[]; selectedDate: string; onSelect: (date: string) => void }) => {
  return (
    <div className="grid grid-cols-7 gap-3 mb-8">
      {recaps.map((r) => {
        const isSelected = selectedDate === r.date;
        const d = new Date(r.date);
        return (
          <div
            key={r.date}
            onClick={() => onSelect(r.date)}
            className={cn(
              "p-3.5 rounded-2xl border cursor-pointer transition-all duration-300 hover:shadow-xl h-[110px] flex flex-col justify-between group relative overflow-hidden",
              isSelected 
                ? "bg-primary/[0.03] border-primary shadow-md scale-[1.02] z-10 ring-1 ring-primary/20" 
                : "bg-card border-border hover:border-primary/30 hover:bg-muted/50 shadow-sm"
            )}
          >
            <div className="flex items-center justify-between relative z-10">
              <span className={cn(
                "text-[10px] font-extrabold uppercase tracking-widest",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {format(d, "EEE, d", { locale: localeId })}
              </span>
              {isToday(d) && (
                <div className="flex items-center gap-1">
                   <span className="text-[8px] font-bold text-primary uppercase">Today</span>
                   <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </div>
            
            <div className="space-y-2 relative z-10">
              <div className="flex items-end justify-between">
                <span className="text-xl font-black text-foreground tracking-tighter leading-none">{r.total}</span>
                <div className="flex items-center gap-0.5 opacity-40 group-hover:opacity-100 transition-opacity">
                  <Activity className="w-3 h-3 text-primary" />
                </div>
              </div>
              <div className="flex h-1.5 gap-[1px] rounded-full overflow-hidden bg-muted/60">
                <div className="h-full bg-primary/60" style={{ width: `${(r.humanAnnotated / r.total) * 100}%` }} />
                <div className="h-full bg-primary/20" style={{ width: `${(r.finalByAI / r.total) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-tight">
                <span>{r.humanAnnotated}H</span>
                <span>{r.finalByAI}A</span>
              </div>
            </div>

            {/* Subtle background texture/gradient for selected */}
            {isSelected && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Daily Detail Section */
const DailyRecapDetail = ({ recap }: { recap: DailyRecap }) => {
  const d = new Date(recap.date);
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-foreground flex items-center gap-2.5 tracking-tight uppercase">
            {format(d, "eeee, dd MMMM yyyy", { locale: localeId })}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Summary of hazard intelligence snapshot</p>
        </div>
        <div className="flex items-center gap-6 bg-muted/30 px-5 py-2.5 rounded-2xl border border-border/50">
           <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-primary/60 shadow-sm" />
             <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Human ({recap.humanAnnotated})</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2.5 h-2.5 rounded-full bg-primary/20 shadow-sm" />
             <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">AI ({recap.finalByAI})</span>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        <LabelAnalyticsSection 
          title="TBC Impact Breakdown" 
          field="tbc" 
          customData={{
            pieData: recap.tbc.slice(0, 7).map(l => ({ name: l.name, value: l.percentage })),
            tableData: recap.tbc.map(l => ({ name: l.name, value: Math.round(recap.total * (l.percentage/100)), pct: l.percentage })),
            finalCount: recap.total,
            waitingCount: 0,
            total: recap.total
          }} 
        />
        <LabelAnalyticsSection 
          title="GR Coverage Breakdown" 
          field="gr" 
          customData={{
            pieData: recap.gr.slice(0, 7).map(l => ({ name: l.name, value: l.percentage })),
            tableData: recap.gr.map(l => ({ name: l.name, value: Math.round(recap.total * (l.percentage/100)), pct: l.percentage })),
            finalCount: recap.total,
            waitingCount: 0,
            total: recap.total
          }} 
        />
        <LabelAnalyticsSection 
          title="PSPP Status Breakdown" 
          field="pspp" 
          customData={{
            pieData: recap.pspp.slice(0, 7).map(l => ({ name: l.name, value: l.percentage })),
            tableData: recap.pspp.map(l => ({ name: l.name, value: Math.round(recap.total * (l.percentage/100)), pct: l.percentage })),
            finalCount: recap.total,
            waitingCount: 0,
            total: recap.total
          }} 
        />
      </div>
      
    </div>
  );
};


const WeeklyView = ({ recaps }: { recaps: DailyRecap[] }) => {
  // Group recaps into Monday-Sunday weeks
  const weeks = useMemo(() => {
    const sorted = [...recaps].sort((a,b) => b.date.localeCompare(a.date));
    const groups: Record<string, DailyRecap[]> = {};
    
    sorted.forEach(r => {
      const d = new Date(r.date);
      // Get Monday of that week
      const monday = startOfWeek(d, { weekStartsOn: 1 });
      const weekKey = format(monday, "yyyy-MM-dd");
      if (!groups[weekKey]) groups[weekKey] = [];
      groups[weekKey].push(r);
    });

    // Convert to array of arrays, each sorted Monday (oldest) to Sunday (newest) internally 
    // for correct display in the 7-column Matrix
    return Object.keys(groups)
      .sort((a,b) => b.localeCompare(a)) // Newest week first
      .map(key => {
         // Within a week, we want Monday to Sunday (index 0 to 6)
         return groups[key].sort((a, b) => a.date.localeCompare(b.date));
      });
  }, [recaps]);

  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const currentWeek = weeks[activeWeekIndex] || [];
  
  // Aggregate data for the whole week
  const weekAggregate = useMemo(() => {
    if (currentWeek.length === 0) return null;
    
    const totalPos = currentWeek.reduce((s, r) => s + r.total, 0);
    const totalHuman = currentWeek.reduce((s, r) => s + r.humanAnnotated, 0);
    const totalAI = currentWeek.reduce((s, r) => s + r.finalByAI, 0);
    
    const aggregateField = (key: "tbc" | "gr" | "pspp") => {
      const labelMap: Record<string, { sum: number; totalInSub: number }> = {};
      let fieldTotal = 0;

      currentWeek.forEach(r => {
        fieldTotal += r.total;
        r[key].forEach(l => {
          if (!labelMap[l.name]) labelMap[l.name] = { sum: 0, totalInSub: 0 };
          labelMap[l.name].sum += l.percentage;
          labelMap[l.name].totalInSub += 1;
        });
      });

      const tableData = Object.entries(labelMap).map(([name, data]) => ({
        name,
        value: Math.round(data.sum / 10), 
        pct: Math.round(data.sum / data.totalInSub)
      })).sort((a, b) => b.pct - a.pct);

      // Daily Trend Data Points - PLOTTING ALL LABELS
      const trendPoints = currentWeek.map(r => {
        const pointData: any = { 
          dateLabel: format(new Date(r.date), "EEE", { locale: localeId }) 
        };
        // Plot all labels found in the week
        tableData.forEach(labelObj => {
          const match = r[key].find(l => l.name === labelObj.name);
          pointData[labelObj.name] = match ? match.percentage : 0;
        });
        return pointData;
      }).reverse();

      return {
        pieData: tableData.slice(0, 7).map(d => ({ name: d.name, value: d.pct })),
        tableData,
        trendPoints,
        finalCount: totalPos, 
        waitingCount: 0,
        total: totalPos
      };
    };

    return {
      tbc: aggregateField("tbc"),
      gr: aggregateField("gr"),
      pspp: aggregateField("pspp"),
      total: totalPos,
      human: totalHuman,
      ai: totalAI
    };
  }, [currentWeek]);

  const [viewMode, setViewMode] = useState<'matrix' | 'trend'>('matrix');
  const [selectedDate, setSelectedDate] = useState<string>(currentWeek[0]?.date || "");
  
  // Ensure selection stays within the active week
  useEffect(() => {
    if (currentWeek.length > 0 && !currentWeek.find(r => r.date === selectedDate)) {
      setSelectedDate(currentWeek[0].date);
    }
  }, [activeWeekIndex, currentWeek, selectedDate]);

  const selectedRecap = useMemo(() => 
    currentWeek.find(r => r.date === selectedDate) || currentWeek[0], 
  [currentWeek, selectedDate]);

  if (weeks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/10 rounded-3xl border border-dashed border-border mt-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
          <CalendarIcon className="w-7 h-7 opacity-20" />
        </div>
        <p className="text-sm font-bold text-foreground">No weekly snapshots found</p>
        <p className="text-[11px] mt-1 max-w-[240px] text-center">Snapshot data is empty for the current selection.</p>
      </div>
    );
  }

  const MondayDate = startOfWeek(new Date(currentWeek[0]?.date), { weekStartsOn: 1 });
  const SundayDate = new Date(MondayDate);
  SundayDate.setDate(MondayDate.getDate() + 6);
  
  // Calculate Week Number of the Month
  const weekNumber = Math.ceil((MondayDate.getDate() + (startOfMonth(MondayDate).getDay() || 7) - 1) / 7);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* ── 1. Navigation Header & Context ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
             <History className="w-6 h-6 text-primary" />
          </div>
          <div>
             <h3 className="text-sm font-black text-foreground tracking-tight uppercase leading-none">
               {format(MondayDate, "MMMM yyyy", { locale: localeId })} — Week {weekNumber}
             </h3>
             <p className="text-[10px] text-muted-foreground mt-1.5 font-bold uppercase tracking-widest flex items-center gap-2">
               <span className="w-1 h-1 rounded-full bg-primary" />
               {format(MondayDate, "dd MMM")} – {format(SundayDate, "dd MMM yyyy")}
             </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/60">
              <button 
                onClick={() => setViewMode('matrix')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  viewMode === 'matrix' ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Matrix
              </button>
              <button 
                onClick={() => setViewMode('trend')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  viewMode === 'trend' ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Trend
              </button>
           </div>

           <div className="h-6 w-px bg-border/40 mx-1" />

           <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-xl border border-border shadow-inner">
             <button 
               onClick={() => setActiveWeekIndex(prev => Math.min(prev + 1, weeks.length - 1))}
               disabled={activeWeekIndex === weeks.length - 1}
               className="p-2 rounded-lg hover:bg-card hover:shadow-xs transition-all disabled:opacity-30"
             >
               <ChevronLeft className="w-4 h-4" />
             </button>
             <div className="h-4 w-px bg-border/50 mx-1" />
             <button 
               onClick={() => setActiveWeekIndex(prev => Math.max(prev - 1, 0))}
               disabled={activeWeekIndex === 0}
               className="p-2 rounded-lg hover:bg-card hover:shadow-xs transition-all disabled:opacity-30"
             >
               <ChevronRight className="w-4 h-4" />
             </button>
           </div>
        </div>
      </div>

       <div className="bg-muted/30 rounded-2xl p-4 px-6 border border-border/50 flex items-center gap-8 shadow-sm">
          <div className="shrink-0 flex flex-col items-center">
             <div className="w-12 h-12 rounded-full border-4 border-primary/10 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent -rotate-45" style={{ clipPath: `conic-gradient(from 0deg, var(--primary) ${(currentWeek.length/7)*360}deg, transparent 0)` }} />
                <span className="text-xs font-black text-primary">{currentWeek.length}/7</span>
             </div>
             <span className="text-[8px] font-black text-muted-foreground uppercase mt-1 opacity-50">Days</span>
          </div>
          
          <div className="flex-1 space-y-2.5">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <h4 className="text-[10px] font-black text-foreground uppercase tracking-widest">Cycle Intelligence Progress</h4>
                   {currentWeek.length < 7 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-tighter">
                   {currentWeek.length === 7 ? "Intelligence Cycle Finalized" : `Collection In Progress — ${7 - currentWeek.length} Units Remaining`}
                </span>
             </div>
             <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden border border-border/40 relative">
                <div 
                   className="h-full bg-primary transition-all duration-1000 shadow-[0_0_15px_rgba(5,122,85,0.3)] relative z-10" 
                   style={{ width: `${(currentWeek.length / 7) * 100}%` }} 
                />
                <div className="absolute inset-0 bg-muted/20 repeating-linear-gradient" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)' }} />
             </div>
          </div>
       </div>

      {/* ── 2. Integrated Intelligence Matrix vs Trend Visualization ── */}
      {viewMode === 'matrix' ? (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm relative overflow-hidden group/matrix transition-all duration-700 isolate">
          <div className="grid grid-cols-7 h-full">
            {(() => {
              const displayDays = [...currentWeek]; // SEN (Mon) to MIN (Sun)
              return [...Array(7)].map((_, i) => {
                const r = displayDays[i];
                const d = r ? new Date(r.date) : null;
                const isSelected = r && selectedRecap?.date === r.date;
                const intensity = r ? Math.min(r.total / 180, 1) : 0;

                if (!r) {
                  return (
                    <div key={`empty-${i}`} className="flex flex-col items-center justify-center border-r border-border/30 last:border-0 bg-muted/5 opacity-20 h-[400px] border-dashed">
                      <Clock className="w-3.5 h-3.5 mb-2 text-muted-foreground opacity-50" />
                      <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Pending</span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={r.date}
                    onClick={() => setSelectedDate(r.date)}
                    className={cn(
                      "flex flex-col border-r border-border last:border-0 transition-all duration-500 relative cursor-pointer group/col",
                      isSelected ? "bg-primary/[0.04] z-10 shadow-[inset_0_0_40px_rgba(37,99,235,0.02)]" : "hover:bg-muted/40"
                    )}
                  >
                    {/* Row 1: Header (Compact) */}
                    <div className="py-4 px-3 text-center border-b border-border/40 bg-muted/5">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.1em] transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground/60"
                      )}>
                        {format(d!, "EEE, d", { locale: localeId })}
                      </p>
                    </div>

                    {/* Row 2: Heatmap Volume Cell (Dense) */}
                    <div className="flex flex-col items-center justify-center py-6 border-b border-border/40 relative overflow-hidden">
                       <div 
                          className="absolute inset-x-0 bottom-0 bg-primary/10 transition-all duration-1000"
                          style={{ height: `${intensity * 100}%` }}
                       />
                       <div className="relative z-10 text-center">
                          <p className={cn("text-3xl font-black tracking-tight tabular-nums transition-transform duration-500", isSelected && "scale-110 text-primary")}>
                            {r.total}
                          </p>
                          <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest opacity-30">Total</span>
                       </div>
                    </div>

                    {/* Row 3: Bold Insights (Ultra-Compact) */}
                    <div className="flex-1 px-4 py-6 space-y-4 bg-muted/5">
                       <div className="space-y-1 group/m">
                          <div className="flex items-center justify-between text-[9px] font-black tracking-tight group-hover/m:text-primary transition-colors">
                             <span className="opacity-60">TBC</span>
                             <span className="tabular-nums text-foreground">{Math.round(r.total * 0.45)}</span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-primary/50 shadow-[0_0_8px_rgba(37,99,235,0.2)]" style={{ width: '45%' }} />
                          </div>
                       </div>
                       <div className="space-y-1 group/m">
                          <div className="flex items-center justify-between text-[9px] font-black tracking-tight group-hover/m:text-primary transition-colors">
                             <span className="opacity-60">GR</span>
                             <span className="tabular-nums text-foreground">{Math.round(r.total * 0.3)}</span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-primary/40 shadow-[0_0_8px_rgba(37,99,235,0.15)]" style={{ width: '30%' }} />
                          </div>
                       </div>
                       <div className="space-y-1 group/m">
                          <div className="flex items-center justify-between text-[9px] font-black tracking-tight group-hover/m:text-primary transition-colors">
                             <span className="opacity-60">PSPP</span>
                             <span className="tabular-nums text-foreground">{Math.round(r.total * 0.25)}</span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-primary/30 shadow-[0_0_8px_rgba(37,99,235,0.1)]" style={{ width: '25%' }} />
                          </div>
                       </div>
                    </div>

                    {/* Row 4: Status Monitor (Hyper-Compact) */}
                    <div className="p-3 bg-background/50 border-t border-border/40">
                       <div className="flex h-1.5 gap-[1px] rounded-full overflow-hidden bg-muted/80 mb-2 shadow-inner">
                          <div className="h-full bg-primary/70" style={{ width: `${(r.humanAnnotated/r.total)*100}%` }} />
                          <div className="h-full bg-primary/20" style={{ width: `${(r.finalByAI/r.total)*100}%` }} />
                       </div>
                       <div className="flex items-center justify-between text-[8px] font-black text-muted-foreground uppercase tracking-tight opacity-50 tabular-nums">
                          <span>{r.humanAnnotated}H</span>
                          <span>{r.finalByAI}A</span>
                       </div>
                    </div>

                    {/* Selection Indicator Overlay */}
                    {isSelected && (
                      <div className="absolute inset-x-0 inset-y-0.5 border-2 border-primary pointer-events-none rounded-xl z-20" />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/80 h-[600px] animate-in zoom-in-95 duration-500 overflow-hidden isolate flex flex-col relative shadow-none">
           {/* Chart Top Header - Flat Design */}
           <div className="p-8 pb-5 flex items-center justify-between border-b border-border/50 bg-background/50">
              <div className="space-y-1.5">
                 <h4 className="text-[11px] font-black text-foreground uppercase tracking-[0.1em]">Intelligence Performance Trend</h4>
                 <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-sm bg-[#057A55]" />
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">TBC Intelligence</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">GR Intelligence</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-sm bg-[#34D399]" />
                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">PSPP Intelligence</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="px-4 py-2 bg-muted/40 border border-border/60 rounded-lg text-right min-w-[120px]">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-0.5 opacity-60">Weekly Average</p>
                    <div className="flex items-center justify-end gap-1.5">
                       <span className="text-xl font-black text-foreground tabular-nums tracking-tighter">114.2</span>
                       <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    </div>
                 </div>
              </div>
           </div>

           {/* Core Chart - Precision Grid */}
           <div className="flex-1 px-8 pt-12 relative group/chart bg-muted/5">
              <ResponsiveContainer width="100%" height="92%">
                <ComposedChart data={[...currentWeek].reverse()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(0,0,0,0.08)" />
                  <XAxis 
                     dataKey="date" 
                     tickFormatter={(val) => format(new Date(val), "EEE, d")}
                     axisLine={false}
                     tickLine={false}
                     tick={{ fontSize: 9, fontWeight: 900, fill: 'rgb(55, 65, 81)' }}
                     dy={15}
                  />
                  <YAxis 
                     axisLine={false}
                     tickLine={false}
                     tick={{ fontSize: 9, fontWeight: 900, fill: 'rgb(55, 65, 81)' }}
                     dx={-15}
                  />
                  <RechartsTooltip 
                     cursor={{ stroke: '#2563eb', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                     content={({ active, payload }) => {
                       if (active && payload && payload.length) {
                         const data = payload[0].payload as DailyRecap;
                         const yesterdayTotal = currentWeek.find(sw => sw.date !== data.date)?.total || data.total;
                         const growth = ((data.total - yesterdayTotal) / yesterdayTotal) * 100;
                         
                         return (
                           <div className="bg-card border border-border/80 p-0 shadow-none rounded-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 min-w-[240px] overflow-hidden">
                             <div className="px-5 py-3 border-b border-border/50 bg-muted/40 flex items-center justify-between">
                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{format(new Date(data.date), "EEE, d MMMM")}</p>
                                <div className={cn(
                                   "px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-widest",
                                   growth >= 0 ? "bg-primary/10 text-primary border-primary/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                )}>
                                   {growth >= 0 ? "+" : ""}{Math.round(growth)}% Growth
                                </div>
                             </div>
                             
                             <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Throughput</span>
                                   <span className="text-sm font-black text-foreground tabular-nums tracking-tighter">{data.total} Intel</span>
                                </div>
                                
                                <div className="space-y-2.5">
                                   {[
                                     { name: 'TBC', val: Math.round(data.total * 0.45), color: '#057A55' },
                                     { name: 'GR', val: Math.round(data.total * 0.3), color: '#10B981' },
                                     { name: 'PSPP', val: Math.round(data.total * 0.25), color: '#34D399' }
                                   ].map((m, idx) => (
                                     <div key={idx} className="flex items-center justify-between text-[9px] font-black uppercase">
                                        <div className="flex items-center gap-2">
                                           <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: m.color }} />
                                           <span className="text-muted-foreground opacity-70">{m.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                           <span className="text-foreground">{m.val}</span>
                                           <span className="text-muted-foreground opacity-30 tabular-nums w-8 text-right">({Math.round((m.val/data.total)*100)}%)</span>
                                        </div>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           </div>
                         );
                       }
                       return null;
                     }}
                  />
                  
                  {/* Operational Series - Flat Lines */}
                  <Line 
                     type="linear" 
                     dataKey={(d) => Math.round(d.total * 0.45)} 
                     name="TBC" 
                     stroke="#057A55" 
                     strokeWidth={2.5} 
                     dot={{ r: 2.5, fill: '#057A55', strokeWidth: 0 }}
                     activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#057A55' }}
                  />
                  <Line 
                     type="linear" 
                     dataKey={(d) => Math.round(d.total * 0.3)} 
                     name="GR" 
                     stroke="#10B981" 
                     strokeWidth={2.5} 
                     dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }}
                     activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#10B981' }}
                  />
                  <Line 
                     type="linear" 
                     dataKey={(d) => Math.round(d.total * 0.2)} 
                     name="PSPP" 
                     stroke="#34D399" 
                     strokeWidth={2.5} 
                     dot={{ r: 2.5, fill: '#34D399', strokeWidth: 0 }}
                     activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#34D399' }}
                  />
                  
                  {/* Baseline Context - Solid Area */}
                  <Area
                    type="linear"
                    dataKey="total"
                    stroke="none"
                    fill="rgba(5,122,85,0.06)"
                    isAnimationActive={true}
                  />

                  {/* Throughput - Minimalist Bars */}
                  <Bar 
                     dataKey="total" 
                     fill="rgba(5,122,85,0.08)"
                     radius={[0, 0, 0, 0]} 
                     barSize={20} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
           </div>

        </div>
      )}

      <div className="h-px bg-border/40 w-full" />

      {/* ── 3. High-Level Summary Scorecards ── */}
      <div className="grid grid-cols-4 gap-4">
        <Scorecard label="Total Weekly Ops" value={weekAggregate.total} waiting={0} finalVal={weekAggregate.total} tip="Total hazards for the 7-day window." />
        <Scorecard label="TBC Verified" value={weekAggregate.tbc.total} waiting={0} finalVal={weekAggregate.tbc.total} tip="Aggregate verified TBC infractions." />
        <Scorecard label="GR Verified" value={weekAggregate.gr.total} waiting={0} finalVal={weekAggregate.gr.total} tip="Aggregate verified GR infractions." />
        <Scorecard label="PSPP Verified" value={weekAggregate.pspp.total} waiting={0} finalVal={weekAggregate.pspp.total} tip="Aggregate verified PSPP infractions." />
      </div>

      {/* ── 4. Behavioral Trend Analytics ── */}
      <div className="space-y-12">
         <div className="flex items-center justify-between px-2 pt-4">
             <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-65 flex items-center gap-3">
               <span className="w-8 h-[1px] bg-border" /> Distribution Dynamics (Full Week)
             </h4>
             <span className="text-[9px] font-black text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/25 border-dashed uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.1)]">
               Active Aggregate Window
             </span>
          </div>

          <div className="space-y-12">
             <LabelAnalyticsSection title="TBC Intelligence" field="tbc" customData={weekAggregate.tbc} trendData={weekAggregate.tbc.trendPoints} />
             <LabelAnalyticsSection title="GR Intelligence" field="gr" customData={weekAggregate.gr} trendData={weekAggregate.gr.trendPoints} />
             <LabelAnalyticsSection title="PSPP Intelligence" field="pspp" customData={weekAggregate.pspp} trendData={weekAggregate.pspp.trendPoints} />
          </div>
      </div>

      {selectedRecap && (
        <div className="space-y-10 pt-12 border-t border-border/40 animate-in slide-in-from-bottom-8 fade-in-0 duration-700">
           <div className="bg-card/30 rounded-[2rem] border border-border/40 p-1">
              <DailyRecapDetail recap={selectedRecap} />
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
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    if (open) {
      setDrawerDate(dateRange);
      setDrawerFilters(emptyFilters);
      setViewMode("daily");
    }
  }, [open, dateRange]);

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
    // Hardcoded dummy analytics data
    return {
      total: 350, totalWaiting: 55, totalFinal: 295,
      tbc: { final: 180, waiting: 30 },
      gr: { final: 75, waiting: 15 },
      pspp: { final: 40, waiting: 10 },
    };
  }, [analyticsData]);

  const isFilterDifferent = !dateRangesEqual(drawerDate, dateRange) || !filtersEqual(drawerFilters, { ...emptyFilters, ...filters });
  const hasDrawerFilters = Object.values(drawerFilters).some(arr => arr.length > 0) || !dateRangesEqual(drawerDate, dateRange);

  const handleReset = () => {
    setDrawerDate(dateRange);
    setDrawerFilters(emptyFilters);
  };

  const handleApply = () => {
    onClose();
  };

  const overviewContent = (
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
  );

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
        {/* ── Top Level View Switcher ── */}
        <div className="px-7 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <ViewSwitcher view={viewMode} onChange={setViewMode} />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 pr-3 border-r border-border/60">
                <div className="flex flex-col items-end">
                   <span className="text-[9px] font-black text-foreground uppercase tracking-tighter leading-none">Intelligence Hub</span>
                   <span className="text-[8px] text-muted-foreground mt-1 font-bold uppercase tracking-widest opacity-60">Status: Operational</span>
                </div>
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full shadow-sm ring-4 transition-all duration-700",
                  viewMode === "daily" ? "bg-primary ring-primary/10 animate-pulse" : "bg-primary/20 ring-primary/5"
                )} />
              </div>
              <button 
                onClick={onClose} 
                className="p-2 -mr-2 rounded-xl hover:bg-background hover:shadow-xs transition-all text-muted-foreground hover:text-foreground"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>


        {/* ── Sticky Filter Bar ── */}
        <div className="px-7 py-4 border-b border-border bg-card/80 backdrop-blur-sm shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AnalyticsDateFilter dateRange={drawerDate} onChange={setDrawerDate} mode={viewMode} />
            </div>
            <div className="h-4 w-px bg-border/60 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <AnalyticsMultiSelect label="Site" options={filterOptions.sites} selected={drawerFilters.site} onChange={(v) => setDrawerFilters(prev => ({ ...prev, site: v }))} />
              <AnalyticsMultiSelect label="Lokasi" options={filterOptions.lokasi} selected={drawerFilters.lokasi} onChange={(v) => setDrawerFilters(prev => ({ ...prev, lokasi: v }))} />
              <AnalyticsMultiSelect label="Detail Lokasi" options={filterOptions.detail_location} selected={drawerFilters.detail_location} onChange={(v) => setDrawerFilters(prev => ({ ...prev, detail_location: v }))} />
            </div>

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

        </div>

        <div className="flex-1 overflow-y-auto px-7 py-8 scrollbar-thin bg-card">
          <div className="animate-in fade-in duration-500">
             {viewMode === "daily" && overviewContent}
             {viewMode === "weekly" && <WeeklyView recaps={mockDailyRecaps} />}
          </div>
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
