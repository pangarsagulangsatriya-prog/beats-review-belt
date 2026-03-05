import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, Clock, AlertCircle } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isToday, isSameDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

type PresetKey = "today" | "yesterday" | "7days" | "30days" | "custom";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Hari ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "7days", label: "7 hari terakhir" },
  { key: "30days", label: "30 hari terakhir" },
  { key: "custom", label: "Custom…" },
];

function getActivePreset(range: DateRange): PresetKey {
  const today = startOfDay(new Date());
  if (isSameDay(range.from, today) && isSameDay(range.to, today)) return "today";
  const yesterday = subDays(today, 1);
  if (isSameDay(range.from, yesterday) && isSameDay(range.to, yesterday)) return "yesterday";
  const d7 = subDays(today, 6);
  if (isSameDay(range.from, d7) && isSameDay(range.to, today)) return "7days";
  const d30 = subDays(today, 29);
  if (isSameDay(range.from, d30) && isSameDay(range.to, today)) return "30days";
  return "custom";
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

const DateFilter = ({ dateRange, onDateRangeChange }: DateFilterProps) => {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(dateRange.from);
  const [customTo, setCustomTo] = useState<Date | undefined>(dateRange.to);

  const activePreset = getActivePreset(dateRange);
  const isHistoryMode = activePreset !== "today";

  const handlePreset = (key: PresetKey) => {
    const today = startOfDay(new Date());
    switch (key) {
      case "today":
        onDateRangeChange({ from: today, to: today });
        setOpen(false);
        setShowCustom(false);
        break;
      case "yesterday": {
        const y = subDays(today, 1);
        onDateRangeChange({ from: y, to: y });
        setOpen(false);
        setShowCustom(false);
        break;
      }
      case "7days":
        onDateRangeChange({ from: subDays(today, 6), to: today });
        setOpen(false);
        setShowCustom(false);
        break;
      case "30days":
        onDateRangeChange({ from: subDays(today, 29), to: today });
        setOpen(false);
        setShowCustom(false);
        break;
      case "custom":
        setShowCustom(true);
        setCustomFrom(dateRange.from);
        setCustomTo(dateRange.to);
        break;
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors",
              isHistoryMode
                ? "border-status-progress/40 bg-status-progress/8 text-foreground"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">Tanggal Laporan:</span>
            <span className="font-semibold">{formatDateLabel(dateRange)}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <div className="flex">
            {/* Presets */}
            <div className="border-r border-border p-2 min-w-[140px]">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">Rentang Waktu</p>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => handlePreset(p.key)}
                  className={cn(
                    "block w-full text-left px-2.5 py-1.5 text-[11px] rounded transition-colors",
                    activePreset === p.key && p.key !== "custom"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              ))}
              <div className="mt-2 px-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Clock className="w-2.5 h-2.5" />
                  <span>WIB (UTC+7)</span>
                </div>
              </div>
            </div>
            {/* Custom calendar */}
            {showCustom && (
              <div className="p-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">Pilih Rentang</p>
                <div className="flex gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground px-1 mb-0.5">Dari</p>
                    <Calendar
                      mode="single"
                      selected={customFrom}
                      onSelect={(d) => d && setCustomFrom(d)}
                      className="p-2 pointer-events-auto"
                      initialFocus
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground px-1 mb-0.5">Sampai</p>
                    <Calendar
                      mode="single"
                      selected={customTo}
                      onSelect={(d) => d && setCustomTo(d)}
                      className="p-2 pointer-events-auto"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2 px-1">
                  <button
                    onClick={() => { setShowCustom(false); }}
                    className="px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={applyCustom}
                    disabled={!customFrom || !customTo}
                    className="px-3 py-1 text-[11px] font-medium bg-primary text-primary-foreground rounded transition-colors hover:bg-primary/90 disabled:opacity-40"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* History mode indicator */}
      {isHistoryMode && (
        <span className="inline-flex items-center gap-1 text-[10px] text-status-progress">
          <AlertCircle className="w-3 h-3" />
          Mode riwayat: menampilkan data {formatDateLabel(dateRange)}
        </span>
      )}
    </div>
  );
};

export default DateFilter;
