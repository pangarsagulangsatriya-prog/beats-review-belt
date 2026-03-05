import { useState, useCallback, useEffect, useMemo } from "react";
import { Eye, Brain, ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { HazardTask, AILabel } from "@/types/hazard";
import { mockHazards } from "@/data/mockHazards";
import AnnotationPopover from "./AnnotationPopover";
import FilterBar, { ColumnFilters, emptyFilters } from "./FilterBar";
import TaskDrawer from "./TaskDrawer";
import LabelColumnHeader, { LabelFilterValue, LabelSortValue } from "./LabelColumnHeader";
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
        <img src={src} alt="hazard" className="w-9 h-9 rounded-md object-cover cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all shadow-sm" />
      </TooltipTrigger>
      <TooltipContent side="right" className="p-1 w-[220px]" align="center">
        <img src={src} alt="hazard preview" className="w-full rounded-md object-cover" />
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

// Column definitions for sortable headers
const COLUMNS = [
  { key: null, label: "Task ID", sortable: false },
  { key: "timestamp" as SortKey, label: "Timestamp", sortable: true },
  { key: null, label: "PIC Perusahaan", sortable: false },
  { key: "site" as SortKey, label: "Site", sortable: true },
  { key: "lokasi" as SortKey, label: "Lokasi", sortable: true },
  { key: null, label: "Detail Location", sortable: false },
  { key: null, label: "Ketidaksesuaian", sortable: false },
  { key: null, label: "Sub Ketidaksesuaian", sortable: false },
  { key: null, label: "Description", sortable: false },
  { key: null, label: "Img", sortable: false },
  { key: "tbc_rel" as SortKey, label: "TBC", sortable: true },
  { key: "pspp_rel" as SortKey, label: "PSPP", sortable: true },
  { key: "gr_rel" as SortKey, label: "GR", sortable: true },
  { key: "time_left" as SortKey, label: "Detail", sortable: false },
];

const PAGE_SIZE = 10;

const HazardTable = () => {
  const [hazards, setHazards] = useState<HazardTask[]>(mockHazards);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ColumnFilters>(emptyFilters);
  const [drawerTask, setDrawerTask] = useState<HazardTask | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [activeColIdx, setActiveColIdx] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState<{ taskId: string; field: "tbc" | "pspp" | "gr" } | null>(null);
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });
  const [hoverColIdx, setHoverColIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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
      setActiveColIdx(null);
    } else {
      setActiveRowId(taskId);
      setActiveColIdx(null);
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
      if (e.key === "Escape" && activeRowId) { setActiveRowId(null); setActiveColIdx(null); return; }

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
        setActiveColIdx(prev => Math.min((prev ?? -1) + 1, 13));
      }
      if (activeRowId && e.key === "ArrowLeft") {
        setActiveColIdx(prev => Math.max((prev ?? 1) - 1, 0));
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
  const COLUMN_FIELD_MAP: Record<number, { label: string; key: keyof HazardTask }> = {
    0: { label: "Task ID", key: "id" },
    1: { label: "Timestamp", key: "timestamp" },
    2: { label: "PIC Perusahaan", key: "pic_perusahaan" },
    3: { label: "Site", key: "site" },
    4: { label: "Lokasi", key: "lokasi" },
    5: { label: "Detail Location", key: "detail_location" },
    6: { label: "Ketidaksesuaian", key: "ketidaksesuaian" },
    7: { label: "Sub Ketidaksesuaian", key: "sub_ketidaksesuaian" },
    8: { label: "Description", key: "description" },
  };

  const formulaField = activeColIdx !== null && COLUMN_FIELD_MAP[activeColIdx]
    ? COLUMN_FIELD_MAP[activeColIdx]
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

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Tabel Labeling</h2>
        <span className="text-[10px] text-muted-foreground">{filtered.length} tasks</span>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
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
            <span className="text-foreground flex-1 min-w-0 truncate text-[11px]">{String(activeRow[formulaField.key])}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground">
            <span>{activeRow.pic_perusahaan}</span>
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
              <tr className="bg-muted/50">
                <th className="text-center px-2 py-2 font-medium text-muted-foreground border-b border-r border-border w-[36px] text-[10px]">#</th>
                {COLUMNS.map((col, i) => {
                    const labelField = col.key === "tbc_rel" ? "tbc" as const : col.key === "pspp_rel" ? "pspp" as const : col.key === "gr_rel" ? "gr" as const : null;
                    return (
                    <th
                      key={col.label}
                      className={cn(
                        "text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap border-b border-r border-border last:border-r-0 group transition-colors text-[10px] uppercase tracking-wider",
                        col.sortable && !labelField && "cursor-pointer select-none hover:bg-muted/90",
                        activeColIdx === i && "bg-primary/[0.06]",
                        hoverColIdx === i && "bg-muted/90",
                        sort.key === col.key && sort.dir && "bg-primary/[0.04]",
                        labelField && labelFilters[labelField] !== "all" && "bg-primary/[0.04]"
                      )}
                      onClick={() => col.sortable && !labelField && handleSort(col.key)}
                      onMouseEnter={() => setHoverColIdx(i)}
                      onMouseLeave={() => setHoverColIdx(null)}
                    >
                      {labelField ? (
                        <LabelColumnHeader
                          label={col.label}
                          filter={labelFilters[labelField]}
                          sort={labelSorts[labelField]}
                          onFilterChange={(v) => setLabelFilters(prev => ({ ...prev, [labelField]: v }))}
                          onSortChange={(v) => {
                            // Clear other label sorts when setting one
                            setLabelSorts({ tbc: null, pspp: null, gr: null, [labelField]: v });
                            // Clear global sort when label sort is active
                            if (v) setSort({ key: null, dir: null });
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{col.label}</span>
                          {col.sortable && renderSortIcon(col.key)}
                        </div>
                      )}
                    </th>
                    );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((h, rowIndex) => {
                const minRelevance = getMinRelevance(h);
                const hoursLeft = getHoursLeft(h.sla_deadline);
                const isLowRelevance = minRelevance < 70 && h.status !== "completed" && h.status !== "auto_confirmed";
                const isUrgent = hoursLeft < 6 && h.status !== "completed" && h.status !== "auto_confirmed";
                const isActive = activeRowId === h.id;
                const isBeingEdited = editingLabel?.taskId === h.id;
                const isDimmed = isEditingRow && !isBeingEdited;
                const expanded = isRowExpanded(h.id);

                const cellClass = (colIdx: number) => cn(
                  "px-3 py-2 border-r border-b border-border last:border-r-0",
                  expanded ? "whitespace-normal" : "whitespace-nowrap",
                  activeColIdx === colIdx && !isActive && "bg-primary/[0.03]",
                  isActive && activeColIdx === colIdx && "ring-2 ring-inset ring-primary/40",
                  hoverColIdx === colIdx && !isActive && "bg-muted/[0.02]"
                );

                const labelCellClass = (colIdx: number, field: "tbc" | "pspp" | "gr") => {
                  const isThisEditing = editingLabel?.taskId === h.id && editingLabel?.field === field;
                  const isOtherEditing = editingLabel && (editingLabel.taskId !== h.id || editingLabel.field !== field);
                  return cn(
                    cellClass(colIdx),
                    "whitespace-nowrap transition-all duration-200",
                    isThisEditing && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20 shadow-[inset_0_-2px_0_hsl(var(--primary))] relative z-10",
                    isOtherEditing && isBeingEdited && "opacity-40"
                  );
                };

                const globalRowIndex = (currentPage - 1) * PAGE_SIZE + rowIndex + 1;

                // When label is clicked, activate that row
                const handleLabelOpen = (taskId: string, field: "tbc" | "pspp" | "gr") => {
                  setActiveRowId(taskId);
                  setActiveColIdx(null);
                  setEditingLabel({ taskId, field });
                };

                return (
                  <tr
                    key={h.id}
                    data-active={isActive ? "true" : undefined}
                    onClick={() => toggleActiveRow(h.id)}
                    className={cn(
                      "transition-all duration-200 cursor-pointer",
                      !isActive && isLowRelevance && !isDimmed && "bg-destructive/[0.03]",
                      !isActive && isUrgent && !isLowRelevance && !isDimmed && "bg-warning/[0.03]",
                      !isActive && !isDimmed && "hover:bg-muted/40",
                      isActive && "bg-primary/[0.06] shadow-[inset_3px_0_0_hsl(var(--primary))]",
                      isBeingEdited && "bg-primary/[0.10] shadow-[inset_3px_0_0_hsl(var(--primary))] ring-1 ring-inset ring-primary/20",
                      isDimmed && "opacity-30 blur-[0.3px] transition-all duration-300"
                    )}
                  >
                    {/* Row index */}
                    <td className={cn(
                      "text-center px-2 py-2 font-mono text-[10px] text-muted-foreground border-r border-b border-border bg-muted/30",
                      isActive && "bg-primary/10 text-primary font-semibold"
                    )}>
                      {globalRowIndex}
                    </td>
                    <td className={cellClass(0)} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(0); }}>
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        {isLowRelevance && <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />}
                        {h.id}
                      </div>
                    </td>
                    <td className={cn(cellClass(1), "text-muted-foreground")} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(1); }}>
                      {h.timestamp}
                    </td>
                    <td className={cellClass(2)} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(2); }}>
                      {expanded ? <span className="text-foreground">{h.pic_perusahaan}</span> : <TruncatedCell text={h.pic_perusahaan} />}
                    </td>
                    <td className={cn(cellClass(3), "text-foreground")} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(3); }}>
                      {h.site}
                    </td>
                    <td className={cn(cellClass(4), "text-foreground")} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(4); }}>
                      {h.lokasi}
                    </td>
                    <td className={cn(cellClass(5), "text-muted-foreground")} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(5); }}>
                      {expanded ? <span>{h.detail_location}</span> : <TruncatedCell text={h.detail_location} maxWidth="max-w-[120px]" />}
                    </td>
                    <td className={cn(cellClass(6), "text-muted-foreground")} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(6); }}>
                      {expanded ? <span>{h.ketidaksesuaian}</span> : <TruncatedCell text={h.ketidaksesuaian} />}
                    </td>
                    <td className={cn(cellClass(7), "text-muted-foreground")} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(7); }}>
                      {expanded ? <span>{h.sub_ketidaksesuaian}</span> : <TruncatedCell text={h.sub_ketidaksesuaian} />}
                    </td>
                    <td className={cn(cellClass(8), "text-muted-foreground")} onClick={(e) => { e.stopPropagation(); toggleActiveRow(h.id); setActiveColIdx(8); }}>
                      {expanded ? <span>{h.description}</span> : <TruncatedCell text={h.description} maxWidth="max-w-[150px]" />}
                    </td>
                    <td className={cellClass(9)} onClick={(e) => e.stopPropagation()}>
                      <ImageCell src={h.image_url} />
                    </td>
                    <td className={labelCellClass(10, "tbc")} onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        {editingLabel?.taskId === h.id && editingLabel?.field === "tbc" && (
                          <span className="absolute -top-1 -right-1 text-[8px] text-muted-foreground font-medium bg-muted px-1 rounded z-10">
                            <Eye className="w-2.5 h-2.5 inline" />
                          </span>
                        )}
                        <AnnotationPopover
                          label={h.tbc}
                          fieldName="TBC"
                          slaDeadline={h.sla_deadline}
                          onApply={(lbl, note) => updateLabel(h.id, "tbc", lbl, note)}
                          disabled={editingLabel !== null && !(editingLabel.taskId === h.id && editingLabel.field === "tbc")}
                          editingBy={editingLabel?.taskId === h.id && editingLabel?.field === "tbc" ? null : editingLabel ? "FAUZAN AJI" : null}
                          onOpenChange={(isOpen) => {
                            if (isOpen) handleLabelOpen(h.id, "tbc");
                            else if (editingLabel?.taskId === h.id && editingLabel?.field === "tbc") setEditingLabel(null);
                          }}
                        />
                      </div>
                    </td>
                    <td className={labelCellClass(11, "pspp")} onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        {editingLabel?.taskId === h.id && editingLabel?.field === "pspp" && (
                          <span className="absolute -top-1 -right-1 text-[8px] text-muted-foreground font-medium bg-muted px-1 rounded z-10">
                            <Eye className="w-2.5 h-2.5 inline" />
                          </span>
                        )}
                        <AnnotationPopover
                          label={h.pspp}
                          fieldName="PSPP"
                          slaDeadline={h.sla_deadline}
                          onApply={(lbl, note) => updateLabel(h.id, "pspp", lbl, note)}
                          disabled={editingLabel !== null && !(editingLabel.taskId === h.id && editingLabel.field === "pspp")}
                          editingBy={editingLabel?.taskId === h.id && editingLabel?.field === "pspp" ? null : editingLabel ? "FAUZAN AJI" : null}
                          onOpenChange={(isOpen) => {
                            if (isOpen) handleLabelOpen(h.id, "pspp");
                            else if (editingLabel?.taskId === h.id && editingLabel?.field === "pspp") setEditingLabel(null);
                          }}
                        />
                      </div>
                    </td>
                    <td className={labelCellClass(12, "gr")} onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        {editingLabel?.taskId === h.id && editingLabel?.field === "gr" && (
                          <span className="absolute -top-1 -right-1 text-[8px] text-muted-foreground font-medium bg-muted px-1 rounded z-10">
                            <Eye className="w-2.5 h-2.5 inline" />
                          </span>
                        )}
                        <AnnotationPopover
                          label={h.gr}
                          fieldName="GR"
                          slaDeadline={h.sla_deadline}
                          onApply={(lbl, note) => updateLabel(h.id, "gr", lbl, note)}
                          disabled={editingLabel !== null && !(editingLabel.taskId === h.id && editingLabel.field === "gr")}
                          editingBy={editingLabel?.taskId === h.id && editingLabel?.field === "gr" ? null : editingLabel ? "FAUZAN AJI" : null}
                          onOpenChange={(isOpen) => {
                            if (isOpen) handleLabelOpen(h.id, "gr");
                            else if (editingLabel?.taskId === h.id && editingLabel?.field === "gr") setEditingLabel(null);
                          }}
                        />
                      </div>
                    </td>
                    <td className={cn(cellClass(13), "border-r-0 whitespace-nowrap")} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openDrawer(h)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted hover:border-muted-foreground/20 transition-all shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-primary/20 bg-primary/5 text-[10px] font-medium text-primary hover:bg-primary/10 hover:border-primary/30 transition-all shadow-sm">
                          <Brain className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-center py-8 text-muted-foreground text-xs">
                    <p>No items found for this filter.</p>
                    {(labelFilters.tbc !== "all" || labelFilters.pspp !== "all" || labelFilters.gr !== "all") && (
                      <button
                        onClick={() => setLabelFilters({ tbc: "all", pspp: "all", gr: "all" })}
                        className="mt-2 text-primary hover:underline text-[11px] font-medium"
                      >
                        Clear all label filters
                      </button>
                    )}
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
    </div>
  );
};

export default HazardTable;
