import { useState } from "react";
import { Calendar as CalendarIcon, Check, Clock } from "lucide-react";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onOpenAnalytics: () => void;
}

type PresetKey = "today" | "yesterday" | "2days" | "3days" | "custom";

const PRESETS: { key: PresetKey; label: string; daysAgo: number }[] = [
  { key: "today", label: "Hari ini", daysAgo: 0 },
  { key: "yesterday", label: "1 hari lalu", daysAgo: 1 },
  { key: "2days", label: "2 hari lalu", daysAgo: 2 },
  { key: "3days", label: "3 hari lalu", daysAgo: 3 },
];

function getActivePreset(range: DateRange): PresetKey | null {
  const today = startOfDay(new Date());
  for (const p of PRESETS) {
    const d = subDays(today, p.daysAgo);
    if (isSameDay(range.from, d) && isSameDay(range.to, d)) return p.key;
  }
  return null;
}

function formatDateLabel(range: DateRange): string {
  if (isSameDay(range.from, range.to)) {
    return format(range.from, "dd MMM yyyy", { locale: localeId });
  }
  if (range.from.getMonth() === range.to.getMonth() && range.from.getFullYear() === range.to.getFullYear()) {
    return `${format(range.from, "dd")}–${format(range.to, "dd MMM yyyy", { locale: localeId })}`;
  }
  return `${format(range.from, "dd MMM", { locale: localeId })}–${format(range.to, "dd MMM yyyy", { locale: localeId })}`;
}

function formatPresetDate(daysAgo: number): string {
  const d = subDays(startOfDay(new Date()), daysAgo);
  return format(d, "dd MMM yyyy", { locale: localeId });
}

const DateFilter = ({ dateRange, onDateRangeChange, onOpenAnalytics }: DateFilterProps) => {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(dateRange.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(dateRange.to);

  const activePreset = getActivePreset(dateRange);

  const handlePreset = (key: PresetKey) => {
    const today = startOfDay(new Date());
    const preset = PRESETS.find(p => p.key === key);
    if (preset) {
      const d = subDays(today, preset.daysAgo);
      onDateRangeChange({ from: d, to: d });
      setOpen(false);
      setShowCustom(false);
    }
  };

  const applyCustom = () => {
    if (customFrom && customTo) {
      const from = customFrom < customTo ? customFrom : customTo;
      const to = customFrom < customTo ? customTo : customFrom;
      onDateRangeChange({ from: startOfDay(from), to: startOfDay(to) });
      setOpen(false);
      setShowCustom(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Date Picker - Airbnb style */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-medium transition-all",
              "border-border bg-card text-foreground hover:shadow-sm hover:border-foreground/20",
              activePreset === "today" && "border-primary/30"
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className={cn(
              "font-semibold",
              activePreset === "today" ? "text-primary" : "text-foreground"
            )}>
              {activePreset === "today" ? "Hari ini" : activePreset ? PRESETS.find(p => p.key === activePreset)?.label : "Custom"}
            </span>
            <span className="text-muted-foreground">{formatDateLabel(dateRange)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border-border" align="start" sideOffset={6}>
          <div className="flex">
            {/* Presets list */}
            <div className="py-2 min-w-[180px]">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePreset(p.key)}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-2.5 text-left transition-colors",
                    activePreset === p.key
                      ? "bg-primary/5"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className={cn(
                      "w-4 h-4",
                      activePreset === p.key ? "text-primary" : "text-muted-foreground"
                    )} />
                    <div>
                      <div className={cn(
                        "text-sm font-medium",
                        activePreset === p.key ? "text-primary" : "text-foreground"
                      )}>
                        {p.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatPresetDate(p.daysAgo)}
                      </div>
                    </div>
                  </div>
                  {activePreset === p.key && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
              {/* Custom option */}
              <button
                onClick={() => {
                  setShowCustom(true);
                  setCustomFrom(dateRange.from);
                  setCustomTo(dateRange.to);
                }}
                className={cn(
                  "flex items-center w-full px-4 py-2.5 text-left transition-colors border-t border-border",
                  activePreset === null ? "bg-primary/5" : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon className={cn(
                    "w-4 h-4",
                    activePreset === null ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div>
                    <div className={cn(
                      "text-sm font-medium",
                      activePreset === null ? "text-primary" : "text-foreground"
                    )}>
                      Custom…
                    </div>
                  </div>
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
                    <Calendar
                      mode="single"
                      selected={customFrom}
                      onSelect={(d) => d && setCustomFrom(d)}
                      className="p-2 pointer-events-auto"
                      initialFocus
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Sampai</p>
                    <Calendar
                      mode="single"
                      selected={customTo}
                      onSelect={(d) => d && setCustomTo(d)}
                      className="p-2 pointer-events-auto"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setShowCustom(false)}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={applyCustom}
                    disabled={!customFrom || !customTo}
                    className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Analytics button - inline with date */}
      <button
        onClick={onOpenAnalytics}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:shadow-sm hover:border-foreground/20 transition-all"
      >
        <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
        Lihat Analytics
      </button>
    </div>
  );
};

export default DateFilter;
