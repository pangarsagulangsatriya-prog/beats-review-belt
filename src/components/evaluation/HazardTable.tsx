import { useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import { Eye, EyeOff, Brain, ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight, GripVertical, Settings2, Search, X, Check, RefreshCcw, Lock, Briefcase, ArrowRightToLine, ChevronDown, Info, CheckCircle2, Columns, Rows, Anchor } from "lucide-react";
import { HazardTask, AILabel } from "@/types/hazard";
import { mockHazards } from "@/data/mockHazards";
import AnnotationPopover from "./AnnotationPopover";
import FilterBar, { ColumnFilters, emptyFilters } from "./FilterBar";
import TaskDrawer from "./TaskDrawer";
import LabelColumnHeader, { LabelFilterValue, LabelSortValue } from "./LabelColumnHeader";
import DateFilter, { DateRange } from "./DateFilter";
import AnalyticsDrawer from "./AnalyticsDrawer";
import { InstrumentDrawer } from "./InstrumentDrawer";
import { startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function getMinRelevance(task: HazardTask): number {
  const fields: ("tbc" | "pspp" | "gr")[] = ["tbc", "pspp", "gr"];
  let min = 100;
  for (const f of fields) {
    const label = task[f];
    if (!label.locked && !label.auto_confirmed && label.candidates.length > 0) {
      min = Math.min(min, label.candidates[0].relevance);
    }
  }
  return min;
}

function getHoursLeft(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 3600000));
}

function getLabelText(label: AILabel): string {
  return label.human_label || label.ai_label || "";
}

/** Truncated cell with tooltip */
const TruncatedCell = ({ text, maxWidth = "max-w-[130px]" }: { text: string; maxWidth?: string }) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("block truncate", maxWidth)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] text-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

/** Image cell with hover preview */
const ImageCell = ({ src }: { src: string }) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative group/img-cell shrink-0">
          <div className="w-11 h-11 rounded-[6px] border border-border bg-muted/20 overflow-hidden transition-all group-hover/img-cell:border-primary/50 shadow-xs">
            <img 
              src={src} 
              alt="hazard" 
              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-500" 
            />
          </div>
          <div className="absolute inset-0 rounded-[6px] ring-1 ring-inset ring-black/5 pointer-events-none" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="p-0.5 w-[280px] rounded-[8px] border-border shadow-2xl bg-popover" align="center">
        <div className="aspect-square w-full overflow-hidden rounded-[6px]">
          <img src={src} alt="hazard preview" className="w-full h-full object-cover" />
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Sort state types
type SortDir = "asc" | "desc" | null;
type SortKey = "timestamp" | "site" | "lokasi" | "tbc_rel" | "pspp_rel" | "gr_rel" | "time_left" | null;

interface SortState {
  key: SortKey;
  dir: SortDir;
}

interface ColumnDef {
  id: string;
  key: SortKey | null;
  label: string;
  sortable: boolean;
  isCritical?: boolean;
  width?: string;
}

// Column definitions for sortable headers
const COLUMNS: ColumnDef[] = [
  { id: "id", key: null, label: "Task ID", sortable: false, isCritical: true, width: "w-[58px]" },
  { id: "timestamp", key: "timestamp" as SortKey, label: "Timestamp", sortable: true, width: "w-[95px]" },
  { id: "pic", key: null, label: "PIC Perusahaan", sortable: false, width: "w-[105px]" },
  { id: "site", key: "site" as SortKey, label: "Site", sortable: true, width: "w-[45px]" },
  { id: "lokasi", key: "lokasi" as SortKey, label: "Lokasi", sortable: true, width: "w-[65px]" },
  { id: "detail_location", key: null, label: "Detail Location", sortable: false, width: "w-[95px]" },
  { id: "ketidaksesuaian", key: null, label: "Ketidaksesuaian", sortable: false, width: "w-[115px]" },
  { id: "sub_ketidaksesuaian", key: null, label: "Sub Ketidaksesuaian", sortable: false, width: "w-[115px]" },
  { id: "description", key: null, label: "Description", sortable: false, width: "w-[190px]" },
  { id: "img", key: null, label: "Img", sortable: false, width: "w-[42px]" },
  { id: "tbc", key: "tbc_rel" as SortKey, label: "TBC", sortable: true, width: "w-[130px]" },
  { id: "pspp", key: "pspp_rel" as SortKey, label: "PSPP", sortable: true, width: "w-[130px]" },
  { id: "gr", key: "gr_rel" as SortKey, label: "GR", sortable: true, width: "w-[130px]" },
  { id: "action", key: "time_left" as SortKey, label: "Detail", sortable: false, isCritical: true, width: "w-[32px]" },
];

const PAGE_SIZE = 10;

const HazardTable = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: startOfDay(new Date()),
  });
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [hazards, setHazards] = useState<HazardTask[]>(mockHazards);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ColumnFilters>(emptyFilters);
  const [drawerTask, setDrawerTask] = useState<HazardTask | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [instrumentPanelOpen, setInstrumentPanelOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [activeColId, setActiveColId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<{ taskId: string; field: "tbc" | "pspp" | "gr" } | null>(null);
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });
  const [hoverColId, setHoverColId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("hazardVisibleColumns");
    return saved ? JSON.parse(saved) : COLUMNS.map(c => c.id);
  });
  const [freezeColumns, setFreezeColumns] = useState<number>(1);
  const [rowHeight, setRowHeight] = useState<number>(1);

  useEffect(() => {
    localStorage.setItem("hazardVisibleColumns", JSON.stringify(visibleColumnIds));
  }, [visibleColumnIds]);

  // Per-column label filter & sort
  const [labelFilters, setLabelFilters] = useState<Record<"tbc" | "pspp" | "gr", LabelFilterValue>>({
    tbc: "all", pspp: "all", gr: "all",
  });
  const [labelSorts, setLabelSorts] = useState<Record<"tbc" | "pspp" | "gr", LabelSortValue | null>>({
    tbc: null, pspp: null, gr: null,
  });

  // Auto-confirm timer — fix metadata for AI auto-confirm
  useEffect(() => {
    const interval = setInterval(() => {
      setHazards((prev) =>
        prev.map((h) => {
          if (h.status === "completed" || h.status === "human_locked") return h;
          const now = Date.now();
          const deadline = new Date(h.sla_deadline).getTime();
          if (now < deadline) return h;
          const fields: ("tbc" | "pspp" | "gr")[] = ["tbc", "pspp", "gr"];
          let changed = false;
          const updated = { ...h };
          for (const f of fields) {
            if (!updated[f].locked && !updated[f].auto_confirmed) {
              updated[f] = {
                ...updated[f],
                human_label: updated[f].ai_label,
                auto_confirmed: true,
                locked: true,
                annotated_by: null,
                annotated_at: new Date().toISOString(),
                annotation_note: "Auto-confirmed by AI (SLA expired)",
              };
              changed = true;
            }
          }
          if (changed) updated.status = "auto_confirmed";
          return updated;
        })
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const filterOptions = useMemo(() => {
    const unique = (arr: string[]) => [...new Set(arr.filter(Boolean))].sort();
    return {
      sites: unique(hazards.map(h => h.site)),
      lokasi: unique(hazards.map(h => h.lokasi)),
      detail_location: unique(hazards.map(h => h.detail_location)),
      ketidaksesuaian: unique(hazards.map(h => h.ketidaksesuaian)),
      sub_ketidaksesuaian: unique(hazards.map(h => h.sub_ketidaksesuaian)),
      pic_perusahaan: unique(hazards.map(h => h.pic_perusahaan)),
      tbcLabels: unique(hazards.map(h => getLabelText(h.tbc))),
      psppLabels: unique(hazards.map(h => getLabelText(h.pspp))),
      grLabels: unique(hazards.map(h => getLabelText(h.gr))),
    };
  }, [hazards]);

  // Helper to check label status for column filtering
  const getLabelStatus = (label: AILabel): "auto_confirmed" | "human_annotated" | "waiting" => {
    if (label.auto_confirmed) return "auto_confirmed";
    if (label.locked && !label.auto_confirmed) return "human_annotated";
    return "waiting";
  };

  const filtered = useMemo(() => {
    let result = hazards.filter((h) => {
      if (search) {
        if (!h.id.toLowerCase().includes(search.toLowerCase())) return false;
      }
      if (filters.pic_perusahaan.length && !filters.pic_perusahaan.includes(h.pic_perusahaan)) return false;
      if (filters.site.length && !filters.site.includes(h.site)) return false;
      if (filters.lokasi.length && !filters.lokasi.includes(h.lokasi)) return false;
      if (filters.detail_location.length && !filters.detail_location.includes(h.detail_location)) return false;
      if (filters.ketidaksesuaian.length && !filters.ketidaksesuaian.includes(h.ketidaksesuaian)) return false;
      if (filters.sub_ketidaksesuaian.length && !filters.sub_ketidaksesuaian.includes(h.sub_ketidaksesuaian)) return false;
      if (filters.tbc.length && !filters.tbc.includes(getLabelText(h.tbc))) return false;
      if (filters.pspp.length && !filters.pspp.includes(getLabelText(h.pspp))) return false;
      if (filters.gr.length && !filters.gr.includes(getLabelText(h.gr))) return false;
      // Per-column label status filters
      if (labelFilters.tbc !== "all" && getLabelStatus(h.tbc) !== labelFilters.tbc) return false;
      if (labelFilters.pspp !== "all" && getLabelStatus(h.pspp) !== labelFilters.pspp) return false;
      if (labelFilters.gr !== "all" && getLabelStatus(h.gr) !== labelFilters.gr) return false;
      return true;
    });

    // Determine active sort: per-column label sort takes priority if set
    const activeLabelSort = (["tbc", "pspp", "gr"] as const).find(f => labelSorts[f] !== null);

    if (activeLabelSort) {
      const field = activeLabelSort;
      const sortVal = labelSorts[field]!;
      result = [...result].sort((a, b) => {
        let cmp = 0;
        const aLabel = a[field];
        const bLabel = b[field];
        switch (sortVal) {
          case "relevance_desc":
            cmp = (bLabel.candidates[0]?.relevance ?? 0) - (aLabel.candidates[0]?.relevance ?? 0);
            break;
          case "relevance_asc":
            cmp = (aLabel.candidates[0]?.relevance ?? 0) - (bLabel.candidates[0]?.relevance ?? 0);
            break;
          case "sla_asc":
            cmp = (new Date(a.sla_deadline).getTime() - Date.now()) - (new Date(b.sla_deadline).getTime() - Date.now());
            break;
          case "sla_desc":
            cmp = (new Date(b.sla_deadline).getTime() - Date.now()) - (new Date(a.sla_deadline).getTime() - Date.now());
            break;
        }
        // Tie-breakers
        if (cmp === 0) cmp = b.timestamp.localeCompare(a.timestamp);
        if (cmp === 0) cmp = a.id.localeCompare(b.id);
        return cmp;
      });
    } else if (sort.key && sort.dir) {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        switch (sort.key) {
          case "timestamp": cmp = a.timestamp.localeCompare(b.timestamp); break;
          case "site": cmp = a.site.localeCompare(b.site); break;
          case "lokasi": cmp = a.lokasi.localeCompare(b.lokasi); break;
          case "tbc_rel": cmp = (a.tbc.candidates[0]?.relevance ?? 0) - (b.tbc.candidates[0]?.relevance ?? 0); break;
          case "pspp_rel": cmp = (a.pspp.candidates[0]?.relevance ?? 0) - (b.pspp.candidates[0]?.relevance ?? 0); break;
          case "gr_rel": cmp = (a.gr.candidates[0]?.relevance ?? 0) - (b.gr.candidates[0]?.relevance ?? 0); break;
          case "time_left": cmp = getHoursLeft(a.sla_deadline) - getHoursLeft(b.sla_deadline); break;
        }
        return sort.dir === "desc" ? -cmp : cmp;
      });
    }

    return result;
  }, [hazards, search, filters, sort, labelFilters, labelSorts]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, filters, sort, labelFilters, labelSorts]);

  const handleSort = useCallback((key: SortKey) => {
    if (!key) return;
    setSort(prev => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  }, []);

  const updateLabel = useCallback(
    (taskId: string, field: "tbc" | "pspp" | "gr", humanLabel: string, note: string) => {
      const isAutoConfirm = note.includes("Auto-confirmed by AI");
      setHazards((prev) =>
        prev.map((h) => {
          if (h.id !== taskId) return h;
          const updatedLabel: AILabel = {
            ...h[field],
            human_label: humanLabel,
            annotation_note: note,
            annotated_by: isAutoConfirm ? null : "FAUZAN AJI",
            annotated_at: new Date().toISOString(),
            locked: true,
            auto_confirmed: isAutoConfirm,
          };
          const newStatus = isAutoConfirm ? "auto_confirmed" as const
            : h.status === "completed" ? "completed" as const
            : "human_locked" as const;
          return { ...h, [field]: updatedLabel, status: newStatus } as HazardTask;
        })
      );
      setEditingLabel(null);
    },
    []
  );

  const handleUpdateTask = useCallback((updated: HazardTask) => {
    setHazards((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    setDrawerTask(updated);
  }, []);

  const handleSubmit = useCallback((taskId: string) => {
    setHazards((prev) => prev.map((h) => (h.id === taskId ? { ...h, status: "completed" as const, submitted_at: new Date().toISOString(), submitted_by: "FAUZAN AJI" } : h)));
    const currentIdx = filtered.findIndex((h) => h.id === taskId);
    const next = filtered[currentIdx + 1];
    if (next) {
      setDrawerTask(next);
    } else {
      setDrawerOpen(false);
      setDrawerTask(null);
    }
  }, [filtered]);

  const openDrawer = (task: HazardTask) => {
    setDrawerTask(task);
    setDrawerOpen(true);
  };

  // Toggle active row on click (click again to deactivate)
  const toggleActiveRow = (taskId: string) => {
    if (activeRowId === taskId) {
      setActiveRowId(null);
      setActiveColId(null);
    } else {
      setActiveRowId(taskId);
      setActiveColId(null);
    }
  };

  const activeRow = useMemo(() => filtered.find(h => h.id === activeRowId) ?? null, [filtered, activeRowId]);

  // Whether a row should show expanded text (active OR being edited)
  const isRowExpanded = (taskId: string) => activeRowId === taskId || editingLabel?.taskId === taskId;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape" && drawerOpen) { setDrawerOpen(false); return; }
      if (e.key === "Escape" && editingLabel) { setEditingLabel(null); return; }
      if (e.key === "Escape" && activeRowId) { setActiveRowId(null); setActiveColId(null); return; }

      if (activeRowId && (e.key === "ArrowDown" || e.key === "j")) {
        e.preventDefault();
        const idx = paginatedData.findIndex(h => h.id === activeRowId);
        const next = paginatedData[idx + 1];
        if (next) setActiveRowId(next.id);
      }
      if (activeRowId && (e.key === "ArrowUp" || e.key === "k")) {
        e.preventDefault();
        const idx = paginatedData.findIndex(h => h.id === activeRowId);
        const prev = paginatedData[idx - 1];
        if (prev) setActiveRowId(prev.id);
      }
      if (activeRowId && e.key === "ArrowRight") {
        const visibleCols = COLUMNS.filter(c => visibleColumnIds.includes(c.id));
        const idx = visibleCols.findIndex(c => c.id === activeColId);
        const next = visibleCols[idx + 1];
        if (next) setActiveColId(next.id);
      }
      if (activeRowId && e.key === "ArrowLeft") {
        const visibleCols = COLUMNS.filter(c => visibleColumnIds.includes(c.id));
        const idx = visibleCols.findIndex(c => c.id === activeColId);
        const prev = visibleCols[idx - 1];
        if (prev) setActiveColId(prev.id);
      }
      if (activeRowId && e.key === "Enter") {
        const row = paginatedData.find(h => h.id === activeRowId);
        if (row) openDrawer(row);
      }

      if (drawerOpen && drawerTask) {
        const idx = paginatedData.findIndex((h) => h.id === drawerTask.id);
        if (e.key === "j" && !e.ctrlKey && !e.metaKey) {
          const next = paginatedData[idx + 1];
          if (next) setDrawerTask(next);
        }
        if (e.key === "k" && !e.ctrlKey && !e.metaKey) {
          const prev = paginatedData[idx - 1];
          if (prev) setDrawerTask(prev);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen, drawerTask, paginatedData, activeRowId, editingLabel]);

  const isEditingRow = editingLabel !== null;

  const renderSortIcon = (colKey: SortKey) => {
    if (!colKey) return null;
    if (sort.key === colKey) {
      return sort.dir === "asc"
        ? <ArrowUp className="w-3 h-3 text-primary" />
        : <ArrowDown className="w-3 h-3 text-primary" />;
    }
    return <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />;
  };

  // Map column index to field name for formula bar
  const COLUMN_FIELD_MAP: Record<string, { label: string; key: keyof HazardTask }> = {
    id: { label: "Task ID", key: "id" },
    timestamp: { label: "Timestamp", key: "timestamp" },
    pic: { label: "PIC Perusahaan", key: "pic_perusahaan" },
    site: { label: "Site", key: "site" },
    lokasi: { label: "Lokasi", key: "lokasi" },
    detail_location: { label: "Detail Location", key: "detail_location" },
    ketidaksesuaian: { label: "Ketidaksesuaian", key: "ketidaksesuaian" },
    sub_ketidaksesuaian: { label: "Sub Ketidaksesuaian", key: "sub_ketidaksesuaian" },
    description: { label: "Description", key: "description" },
  };

  const formulaField = activeColId !== null && COLUMN_FIELD_MAP[activeColId]
    ? COLUMN_FIELD_MAP[activeColId]
    : { label: "Description", key: "description" as keyof HazardTask };

  return (
    <div className="p-5">
      {/* Tabs */}
      <div className="flex items-center gap-0 mb-5 border-b border-border">
        <button className="px-4 py-2 text-[12px] font-semibold text-primary border-b-2 border-primary -mb-px transition-colors">
          Evaluation
        </button>
        <button className="px-4 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground -mb-px border-b-2 border-transparent transition-colors">
          Duplicate
        </button>
      </div>

      <div className="flex items-center justify-between mb-3 min-h-[20px]">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider opacity-60">{filtered.length} tasks matching current filters</span>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        dateFilter={<DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        onOpenColumns={() => setInstrumentPanelOpen(true)}
        visibleCount={visibleColumnIds.length}
        totalCount={COLUMNS.length}
      />

      <AnalyticsDrawer
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        allData={hazards}
        filteredData={filtered}
        dateRange={dateRange}
        filters={filters}
        onApplyToPage={(newDateRange, newFilters) => {
          setDateRange(newDateRange);
          setFilters(prev => ({
            ...prev,
            site: newFilters.site,
            lokasi: newFilters.lokasi,
            detail_location: newFilters.detail_location,
            ketidaksesuaian: newFilters.ketidaksesuaian,
            sub_ketidaksesuaian: newFilters.sub_ketidaksesuaian,
          }));
        }}
      />

      {/* Formula Bar */}
      {activeRow && (
        <div className="bg-card border border-border rounded-t-md px-3 py-1.5 flex items-center gap-3 text-xs" style={{ boxShadow: 'var(--shadow-xs)' }}>
          <span className="font-mono font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded text-[10px] shrink-0 border border-primary/10">
            {activeRow.id}
          </span>
          <div className="h-3.5 w-px bg-border shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-muted-foreground shrink-0 font-medium text-[10px] uppercase tracking-wider">{formulaField.label}</span>
            <span className="text-foreground flex-1 min-w-0 truncate text-[11px]">{activeRow ? String(activeRow[formulaField.key]) : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground">
            <span>{activeRow.pic_perusahaan} – {activeRow.pic_name}</span>
            <span className="text-border">·</span>
            <span>{activeRow.site}</span>
            <span className="text-border">·</span>
            <span>{activeRow.lokasi}</span>
          </div>
        </div>
      )}
            {/* Spreadsheet Table */}
      <div className={cn(
        "bg-card border border-border overflow-hidden",
        activeRow ? "rounded-b-md border-t-0" : "rounded-md"
      )} style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[11px] border-collapse" style={{ borderSpacing: 0 }}>
            <thead>
              <tr className="bg-muted/30 divide-x divide-border/30">
                {/* Row index header - STICKY */}
                <th className="sticky left-0 z-40 bg-muted/50 border-b border-border w-[40px] min-w-[40px] px-2 py-2 text-center text-[10px] uppercase font-bold text-muted-foreground tracking-widest shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)]">
                  #
                </th>
                {COLUMNS.filter(c => visibleColumnIds.includes(c.id)).map((col, idx) => {
                    const isFrozen = idx < freezeColumns;
                    const leftOffset = idx === 0 ? "40px" : idx === 1 ? "98px" : idx === 2 ? "193px" : "298px";
                    const isLastFrozen = idx === freezeColumns - 1;
                    const labelField = (col.id === "tbc" || col.id === "pspp" || col.id === "gr") ? col.id as "tbc" | "pspp" | "gr" : null;

                    return (
                    <th
                      key={col.id}
                      onMouseEnter={() => setHoverColId(col.id)}
                      onMouseLeave={() => setHoverColId(null)}
                      className={cn(
                        "text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2 border-r border-border/80 last:border-r-0 bg-muted/20 select-none group shrink-0 transition-colors",
                        col.width,
                        isFrozen && "sticky z-30 bg-muted/40 backdrop-blur-sm",
                        isLastFrozen && "shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]",
                        col.sortable && !labelField && "cursor-pointer hover:bg-muted/90",
                        activeColId === col.id && "bg-primary/[0.06]"
                      )}
                      style={isFrozen ? { left: leftOffset } : undefined}
                      onClick={() => col.sortable && !labelField && handleSort(col.key)}
                    >
                      {labelField ? (
                        <LabelColumnHeader
                          label={col.label}
                          filter={labelFilters[labelField]}
                          sort={labelSorts[labelField]}
                          onFilterChange={(v) => setLabelFilters(prev => ({ ...prev, [labelField]: v }))}
                          onSortChange={(v) => {
                            setLabelSorts({ tbc: null, pspp: null, gr: null, [labelField]: v });
                            if (v) setSort({ key: null, dir: null });
                          }}
                        />
                      ) : (
                        <div className={cn("truncate flex items-center gap-1 w-full")}>
                          <span>{col.label}</span>
                          {col.sortable && renderSortIcon(col.key)}
                        </div>
                      )}
                    </th>
                    );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {paginatedData.map((h, rowIndex) => {
                const isActive = activeRowId === h.id;
                const isBeingEdited = editingLabel?.taskId === h.id;
                const isLowRelevance = getMinRelevance(h) < 70;
                const isUrgent = getHoursLeft(h.sla_deadline) < 8;
                const isDimmed = isEditingRow && !isBeingEdited;
                const expanded = isRowExpanded(h.id);

                const cellClass = (colId: string) => cn(
                  "px-2 py-1.5 border-r border-b border-border last:border-r-0",
                  expanded ? "whitespace-normal overflow-visible" : "whitespace-nowrap overflow-hidden",
                  activeColId === colId && !isActive && "bg-primary/[0.03]",
                  isActive && activeColId === colId && "ring-2 ring-inset ring-primary/40",
                  hoverColId === colId && !isActive && "bg-muted/[0.02]"
                );

                const globalRowIndex = (currentPage - 1) * PAGE_SIZE + rowIndex + 1;

                const handleLabelOpen = (taskId: string, field: "tbc" | "pspp" | "gr") => {
                  setActiveRowId(taskId);
                  setActiveColId(null);
                  setEditingLabel({ taskId, field });
                };

                return (
                  <tr
                    key={h.id}
                    data-active={isActive ? "true" : undefined}
                    onClick={() => toggleActiveRow(h.id)}
                    className={cn(
                      "transition-all duration-200 cursor-pointer border-b border-border/30 group/row",
                      rowHeight === 1 ? "h-14" : rowHeight === 2 ? "h-20" : "h-28",
                      !isActive && isLowRelevance && !isDimmed && "bg-destructive/[0.03]",
                      !isActive && isUrgent && !isLowRelevance && !isDimmed && "bg-warning/[0.03]",
                      !isActive && !isDimmed && "hover:bg-muted/40",
                      isActive && "bg-primary/[0.06] shadow-[inset_3px_0_0_hsl(var(--primary))]",
                      isBeingEdited && "bg-primary/[0.10] shadow-[inset_3px_0_0_hsl(var(--primary))] ring-1 ring-inset ring-primary/20",
                      isDimmed && "opacity-30 blur-[0.3px] transition-all duration-300",
                      expanded && "bg-primary/[0.02]"
                    )}
                  >
                    {/* Row index - STICKY */}
                    <td className={cn(
                      "sticky left-0 z-20 text-center px-1 py-1 font-mono text-[10px] text-muted-foreground border-r border-border bg-card transition-colors w-[40px] min-w-[40px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.05)]",
                      isActive && "bg-primary/5 text-primary font-semibold"
                    )}>
                      {globalRowIndex}
                    </td>
                    {COLUMNS.filter(c => visibleColumnIds.includes(c.id)).map((col, idx) => {
                      const isFrozen = idx < freezeColumns;
                      const leftOffset = idx === 0 ? "40px" : idx === 1 ? "98px" : idx === 2 ? "193px" : "298px";
                      const isLastFrozen = idx === freezeColumns - 1;
                      
                      const cellClasses = cn(
                        cellClass(col.id),
                        col.width,
                        isFrozen && "sticky z-10 bg-card border-r border-border/40",
                        isLastFrozen && "shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]",
                        isActive && isFrozen && "bg-primary/[0.04]",
                        isBeingEdited && isFrozen && "bg-primary/[0.08]"
                      );

                      const renderCellContent = () => {
                        switch(col.id) {
                          case "id": return (
                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                              {isLowRelevance && <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />}
                              {h.id}
                            </div>
                          );
                          case "timestamp": return <span className="text-muted-foreground">{h.timestamp}</span>;
                          case "pic": return (
                            <div className="flex flex-col leading-tight overflow-hidden">
                              <span className={cn("text-[11px] font-medium text-foreground truncate w-full", !expanded && "max-w-[100px]")}>{h.pic_perusahaan}</span>
                              <span className={cn("text-[10px] font-normal text-muted-foreground truncate w-full", !expanded && "max-w-[100px]")}>{h.pic_name}</span>
                            </div>
                          );
                          case "site": return h.site;
                          case "lokasi": return h.lokasi;
                          case "detail_location": return expanded ? <span>{h.detail_location}</span> : <TruncatedCell text={h.detail_location} maxWidth="max-w-[120px]" />;
                          case "ketidaksesuaian": return expanded ? <div className="leading-tight break-words">{h.ketidaksesuaian}</div> : <TruncatedCell text={h.ketidaksesuaian} maxWidth={col.width} />;
                          case "sub_ketidaksesuaian": return expanded ? <div className="leading-tight break-words">{h.sub_ketidaksesuaian}</div> : <TruncatedCell text={h.sub_ketidaksesuaian} maxWidth={col.width} />;
                          case "description": return expanded ? <div className="leading-tight break-words whitespace-normal py-1 pr-6">{h.description}</div> : <TruncatedCell text={h.description} maxWidth={col.width} />;
                          case "img": return <ImageCell src={h.image_url} />;
                          case "tbc": case "pspp": case "gr": {
                            const field = col.id as "tbc" | "pspp" | "gr";
                            return (
                              <div className="relative">
                                {editingLabel?.taskId === h.id && editingLabel?.field === field && (
                                  <span className="absolute -top-1 -right-1 text-[8px] text-muted-foreground font-medium bg-muted px-1 rounded z-10">
                                    <Eye className="w-2.5 h-2.5 inline" />
                                  </span>
                                )}
                                <AnnotationPopover
                                  label={h[field]}
                                  fieldName={col.label}
                                  slaDeadline={h.sla_deadline}
                                  onApply={(lbl, note) => updateLabel(h.id, field, lbl, note)}
                                  disabled={editingLabel !== null && !(editingLabel.taskId === h.id && editingLabel.field === field)}
                                  editingBy={editingLabel?.taskId === h.id && editingLabel?.field === field ? null : editingLabel ? "FAUZAN AJI" : null}
                                  onOpenChange={(isOpen) => {
                                    if (isOpen) handleLabelOpen(h.id, field);
                                    else if (editingLabel?.taskId === h.id && editingLabel?.field === field) setEditingLabel(null);
                                  }}
                                />
                              </div>
                            );
                          }
                          case "action": return (
                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => openDrawer(h)}
                                className="p-0.5 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all shadow-sm flex items-center justify-center shrink-0"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1 px-2 rounded-md border border-primary/20 bg-primary/5 text-[10px] font-medium text-primary hover:bg-primary/10 transition-all shadow-sm flex items-center gap-1">
                                <Brain className="w-3.5 h-3.5" />
                                <span>AI</span>
                              </button>
                            </div>
                          );
                          default: return null;
                        }
                      };

                      return (
                        <td 
                          key={col.id} 
                          className={cellClasses}
                          style={isFrozen ? { left: leftOffset } : {}}
                          onClick={(e) => {
                            if (col.id === "action" || ["tbc", "pspp", "gr"].includes(col.id)) return;
                            e.stopPropagation();
                            toggleActiveRow(h.id);
                            setActiveColId(col.id);
                          }}
                        >
                          <div className={cn("truncate", col.width)}>
                            {renderCellContent()}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={visibleColumnIds.length + 1} className="text-center py-12 text-muted-foreground text-xs bg-muted/5">
                    <div className="flex flex-col items-center gap-2">
                       <Info className="w-5 h-5 opacity-20" />
                       <p>No tasks identified for current parameters.</p>
                       {(labelFilters.tbc !== "all" || labelFilters.pspp !== "all" || labelFilters.gr !== "all") && (
                         <button
                           onClick={() => setLabelFilters({ tbc: "all", pspp: "all", gr: "all" })}
                           className="mt-1 text-primary hover:underline text-[11px] font-semibold uppercase tracking-wider"
                         >
                           Clear all label filters
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 px-1 text-[11px] text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of {filtered.length} tasks
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={cn(
                "w-6 h-6 rounded text-[11px] font-medium transition-colors",
                page === currentPage ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active row left accent bar via CSS */}
      <style>{`
        tr[data-active="true"] td:first-child {
          box-shadow: inset 3px 0 0 0 hsl(var(--primary));
        }
      `}</style>

      {drawerTask && (
        <TaskDrawer
          task={drawerTask}
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setDrawerTask(null); }}
          onUpdateTask={handleUpdateTask}
          onSubmit={handleSubmit}
        />
      )}

      <InstrumentDrawer
        open={instrumentPanelOpen}
        onClose={() => setInstrumentPanelOpen(false)}
        columns={COLUMNS}
        visibleColumnIds={visibleColumnIds}
        onVisibleColumnIdsChange={setVisibleColumnIds}
        freezeColumns={freezeColumns}
        onFreezeColumnsChange={setFreezeColumns}
        rowHeight={rowHeight}
        onRowHeightChange={setRowHeight}
      />
    </div>
  );
};

export default HazardTable;
