import { Search, X, ChevronDown, MapPin, Navigation, Compass, Tag, Layers, FolderTree, Building2, MapPinned, BarChart3, Filter, Maximize2, Minimize2, Trash2, Lock, CheckSquare, RefreshCcw, Briefcase, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useRef, useEffect, ReactNode } from "react";

export interface ColumnFilters {
  site: string[];
  lokasi: string[];
  detail_location: string[];
  ketidaksesuaian: string[];
  sub_ketidaksesuaian: string[];
  pic_perusahaan: string[];
  tbc: string[];
  pspp: string[];
  gr: string[];
}

export const emptyFilters: ColumnFilters = {
  site: [], lokasi: [], detail_location: [], ketidaksesuaian: [], sub_ketidaksesuaian: [],
  pic_perusahaan: [],
  tbc: [], pspp: [], gr: [],
};

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: ColumnFilters;
  onFiltersChange: (filters: ColumnFilters) => void;
  filterOptions: {
    sites: string[];
    lokasi: string[];
    detail_location: string[];
    ketidaksesuaian: string[];
    sub_ketidaksesuaian: string[];
    pic_perusahaan: string[];
    tbcLabels: string[];
    psppLabels: string[];
    grLabels: string[];
  };
  dateFilter?: ReactNode;
  onOpenAnalytics?: () => void;
  onOpenColumns?: () => void;
  visibleCount: number;
  totalCount: number;
}

const FILTER_ICONS: Record<string, React.ReactNode> = {
  PIC: <Briefcase className="w-3.5 h-3.5 opacity-50" />,
  Site: <MapPin className="w-3.5 h-3.5 opacity-50" />,
  Lokasi: <Navigation className="w-3.5 h-3.5 opacity-50" />,
  Detail: <MapPinned className="w-3.5 h-3.5 opacity-50" />,
  Ketidaksesuaian: <Compass className="w-3.5 h-3.5 opacity-50" />,
  Sub: <FolderTree className="w-3.5 h-3.5 opacity-50" />,
  TBC: <Tag className="w-3.5 h-3.5 opacity-50" />,
  PSPP: <Layers className="w-3.5 h-3.5 opacity-50" />,
  GR: <Tag className="w-3.5 h-3.5 opacity-50" />,
};

const FilterBar = ({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  filterOptions,
  dateFilter,
  onOpenAnalytics,
  onOpenColumns,
  visibleCount,
  totalCount
}: FilterBarProps) => {
  const [mode, setMode] = useState<"expanded" | "compact">(() => {
    return (localStorage.getItem("filterMode") as "expanded" | "compact") || "expanded";
  });

  useEffect(() => {
    localStorage.setItem("filterMode", mode);
  }, [mode]);

  const activeFilters = [
    ...filters.pic_perusahaan.map(v => ({ id: 'pic_perusahaan', label: 'PIC', value: v })),
    ...filters.site.map(v => ({ id: 'site', label: 'Site', value: v })),
    ...filters.lokasi.map(v => ({ id: 'lokasi', label: 'Lokasi', value: v })),
    ...filters.detail_location.map(v => ({ id: 'detail_location', label: 'Detail', value: v })),
    ...filters.ketidaksesuaian.map(v => ({ id: 'ketidaksesuaian', label: 'Ketidaksesuaian', value: v })),
    ...filters.sub_ketidaksesuaian.map(v => ({ id: 'sub_ketidaksesuaian', label: 'Sub', value: v })),
    ...filters.tbc.map(v => ({ id: 'tbc', label: 'TBC', value: v })),
    ...filters.pspp.map(v => ({ id: 'pspp', label: 'PSPP', value: v })),
    ...filters.gr.map(v => ({ id: 'gr', label: 'GR', value: v })),
  ];
  
  const totalActiveFilters = activeFilters.length;

  const clearAll = () => onFiltersChange(emptyFilters);
  const removeFilter = (id: keyof ColumnFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [id]: filters[id].filter(v => v !== value)
    });
  };

  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center gap-3">
        {/* Date filter */}
        <div className="shrink-0">{dateFilter}</div>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search Task ID..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 w-48 text-[11px] rounded-[6px] border-border bg-card hover:border-primary/40 transition-all focus-visible:ring-primary/20"
          />
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center p-0.5 bg-muted/20 border border-border shrink-0 rounded-[6px]">
          <button
            onClick={() => setMode("expanded")}
            className={cn(
              "p-1 transition-all rounded-[4px]",
              mode === "expanded" ? "bg-card text-primary ring-1 ring-border shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            title="Expanded View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMode("compact")}
            className={cn(
              "p-1 transition-all rounded-[4px]",
              mode === "compact" ? "bg-card text-primary ring-1 ring-border shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            title="Compact View"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border/60 shrink-0" />

        {/* Dynamic Filters Area */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {mode === "expanded" ? (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 flex-1 select-none">
              <MultiSelectFilter label="PIC" options={filterOptions.pic_perusahaan} selected={filters.pic_perusahaan}
                onChange={(v) => onFiltersChange({ ...filters, pic_perusahaan: v })} />
              <div className="w-px h-3.5 bg-border/40 shrink-0 mx-1" />
              <MultiSelectFilter label="Site" options={filterOptions.sites} selected={filters.site}
                onChange={(v) => onFiltersChange({ ...filters, site: v })} />
              <MultiSelectFilter label="Lokasi" options={filterOptions.lokasi} selected={filters.lokasi}
                onChange={(v) => onFiltersChange({ ...filters, lokasi: v })} />
              <MultiSelectFilter label="Detail" options={filterOptions.detail_location} selected={filters.detail_location}
                onChange={(v) => onFiltersChange({ ...filters, detail_location: v })} />
              <div className="w-px h-3.5 bg-border/40 shrink-0 mx-1" />
              <MultiSelectFilter label="Ketidaksesuaian" options={filterOptions.ketidaksesuaian} selected={filters.ketidaksesuaian}
                onChange={(v) => onFiltersChange({ ...filters, ketidaksesuaian: v })} />
              <MultiSelectFilter label="Sub" options={filterOptions.sub_ketidaksesuaian} selected={filters.sub_ketidaksesuaian}
                onChange={(v) => onFiltersChange({ ...filters, sub_ketidaksesuaian: v })} />
              <div className="w-px h-3.5 bg-border/40 shrink-0 mx-1" />
              <MultiSelectFilter label="TBC" options={filterOptions.tbcLabels} selected={filters.tbc}
                onChange={(v) => onFiltersChange({ ...filters, tbc: v })} />
              <MultiSelectFilter label="PSPP" options={filterOptions.psppLabels} selected={filters.pspp}
                onChange={(v) => onFiltersChange({ ...filters, pspp: v })} />
              <MultiSelectFilter label="GR" options={filterOptions.grLabels} selected={filters.gr}
                onChange={(v) => onFiltersChange({ ...filters, gr: v })} />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <CompactFilterPanel
                filters={filters}
                onFiltersChange={onFiltersChange}
                filterOptions={filterOptions}
                totalActiveFilters={totalActiveFilters}
              />
              {totalActiveFilters > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap px-1 border-l border-border h-4 flex items-center ml-1 uppercase tracking-wider opacity-60">
                  {totalActiveFilters} active filters
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions - far right */}
        <div className="flex items-center gap-2 shrink-0 ml-auto border-l border-border pl-3">
            <button
              onClick={onOpenColumns}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-[6px] border border-border bg-card text-[11px] font-medium uppercase tracking-wider text-foreground hover:border-primary/40 transition-all shadow-xs group"
            >
              <div className="relative">
                <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                {visibleCount < totalCount && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 border border-background" />
                )}
              </div>
              Columns
            </button>
          
          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-[6px] border border-border bg-card text-[11px] font-medium uppercase tracking-wider text-foreground hover:border-primary/40 transition-all shadow-xs"
            >
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              Analytics
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips (visible in both modes, especially useful for compact) */}
      {totalActiveFilters > 0 && (
        <div className="flex items-center gap-2 min-h-7 animate-in fade-in slide-in-from-left-4 duration-300 group/filters relative">
          <div className="flex items-center gap-2 py-0.5 px-2 bg-muted/10 border border-border rounded-[6px] group-hover/filters:bg-muted/20 transition-all cursor-default">
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 leading-none opacity-80">
              <Filter className="w-2.5 h-2.5" />
              Active Filters <span className="text-primary font-bold ml-0.5">{totalActiveFilters}</span>
            </span>
            <div className="w-[1px] h-3 bg-border mx-1" />
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 text-[9px] font-bold text-destructive uppercase tracking-widest hover:text-destructive/80 transition-all active:scale-95 px-1"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Clear All
            </button>
          </div>

          {/* Hover Detail Card */}
          <div className="absolute top-0 left-0 pt-9 opacity-0 pointer-events-none group-hover/filters:opacity-100 group-hover/filters:pointer-events-auto transition-all duration-300 z-[100]">
            <div className="bg-popover border border-border p-3 shadow-2xl flex flex-wrap gap-1.5 w-[360px] rounded-[6px] animate-in zoom-in-95 backdrop-blur-sm bg-popover/95">
              <div className="w-full text-[9px] font-medium uppercase tracking-widest text-muted-foreground mb-1 flex items-center justify-between opacity-70">
                <span>Composition</span>
                <span className="text-primary font-bold">{totalActiveFilters} Parameter{totalActiveFilters > 1 ? 's' : ''}</span>
              </div>
              {activeFilters.map((f, i) => (
                <div key={`${f.id}-${f.value}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-[4px] text-[9px] font-bold uppercase tracking-tight">
                  <span className="opacity-50">{f.label}:</span>
                  <span className="max-w-[150px] truncate">{f.value}</span>
                  <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive transition-colors ml-1" onClick={() => removeFilter(f.id as keyof ColumnFilters, f.value)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact Filter Panel Component
function CompactFilterPanel({
  filters,
  onFiltersChange,
  filterOptions,
  totalActiveFilters
}: {
  filters: ColumnFilters;
  onFiltersChange: (f: ColumnFilters) => void;
  filterOptions: FilterBarProps['filterOptions'];
  totalActiveFilters: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "h-8 inline-flex items-center gap-1.5 px-3 rounded-[6px] border text-[11px] font-medium uppercase tracking-wider transition-all",
              open ? "border-primary bg-primary/5 text-primary shadow-xs" : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filter {totalActiveFilters > 0 && `(${totalActiveFilters})`}
            <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0 border border-border rounded-[6px] shadow-2xl w-[340px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          sideOffset={8}
          align="start"
        >
          <div className="px-4 py-3 border-b border-border bg-muted/10">
            <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Filters</h3>
          </div>

          <div className="p-2 max-h-[500px] overflow-y-auto space-y-4 scrollbar-thin">
            <FilterSection label="Organization & Location">
              <MultiSelectFilter label="PIC Perusahaan" options={filterOptions.pic_perusahaan} selected={filters.pic_perusahaan}
                onChange={(v) => onFiltersChange({ ...filters, pic_perusahaan: v })} isInline={false} />
              <MultiSelectFilter label="Site" options={filterOptions.sites} selected={filters.site}
                onChange={(v) => onFiltersChange({ ...filters, site: v })} isInline={false} />
              <MultiSelectFilter label="Lokasi" options={filterOptions.lokasi} selected={filters.lokasi}
                onChange={(v) => onFiltersChange({ ...filters, lokasi: v })} isInline={false} />
              <MultiSelectFilter label="Detail Lokasi" options={filterOptions.detail_location} selected={filters.detail_location}
                onChange={(v) => onFiltersChange({ ...filters, detail_location: v })} isInline={false} />
            </FilterSection>

            <FilterSection label="Classification">
              <MultiSelectFilter label="Ketidaksesuaian" options={filterOptions.ketidaksesuaian} selected={filters.ketidaksesuaian}
                onChange={(v) => onFiltersChange({ ...filters, ketidaksesuaian: v })} isInline={false} />
              <MultiSelectFilter label="Sub Ketidaksesuaian" options={filterOptions.sub_ketidaksesuaian} selected={filters.sub_ketidaksesuaian}
                onChange={(v) => onFiltersChange({ ...filters, sub_ketidaksesuaian: v })} isInline={false} />
            </FilterSection>

            <FilterSection label="Evaluation Labels">
              <MultiSelectFilter label="TBC" options={filterOptions.tbcLabels} selected={filters.tbc}
                onChange={(v) => onFiltersChange({ ...filters, tbc: v })} isInline={false} />
              <MultiSelectFilter label="PSPP" options={filterOptions.psppLabels} selected={filters.pspp}
                onChange={(v) => onFiltersChange({ ...filters, pspp: v })} isInline={false} />
              <MultiSelectFilter label="GR" options={filterOptions.grLabels} selected={filters.gr}
                onChange={(v) => onFiltersChange({ ...filters, gr: v })} isInline={false} />
            </FilterSection>
          </div>

          {totalActiveFilters > 0 && (
            <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">{totalActiveFilters} filters active</span>
              <button 
                onClick={() => onFiltersChange(emptyFilters)} 
                className="text-[9px] font-bold text-destructive uppercase tracking-widest hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
  );
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2 px-1">
      <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1 opacity-60">{label}</h4>
      <div className="flex flex-col gap-1.5">
        {children}
      </div>
    </div>
  );
}

// Column Visibility Manager Component
function ColumnVisibilityManager({
  visibleColumnIds,
  onChange,
  columns
}: {
  visibleColumnIds: string[];
  onChange: (ids: string[]) => void;
  columns: { id: string; label: string; isCritical?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string, isCritical?: boolean) => {
    if (isCritical && visibleColumnIds.includes(id)) return; // Critical columns cannot be hidden
    const next = visibleColumnIds.includes(id)
      ? visibleColumnIds.filter(i => i !== id)
      : [...visibleColumnIds, id];
    
    // Ensure at least one column remains visible (or just keep criticals)
    if (next.length > 0) onChange(next);
  };

  const selectAll = () => onChange(columns.map(c => c.id));
  const clearAll = () => onChange(columns.filter(c => c.isCritical).map(c => c.id));
  const resetToDefault = () => onChange(columns.map(c => c.id)); // Default is all visible for now

  const filteredColumns = columns.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const visibleCount = visibleColumnIds.length;
  const totalCount = columns.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-all",
          open ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border bg-card text-foreground hover:bg-muted hover:shadow-sm"
        )}
      >
        <Layers className="w-3.5 h-3.5" />
        Columns {visibleCount < totalCount && `(${visibleCount})`}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-[70] bg-popover border border-border rounded-[6px] w-64 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          {/* Single-Row Action Bar */}
          <div className="px-3 py-1.5 border-b border-border flex items-center gap-2 bg-muted/10">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground opacity-50" />
              <input
                type="text"
                placeholder="Find column..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-7.5 pr-2 py-1.5 text-[10px] font-bold bg-transparent border-none rounded-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground placeholder:uppercase placeholder:tracking-widest"
              />
            </div>
            
            <div className="flex items-center gap-1 shrink-0 p-0.5 bg-background/60 rounded-none border border-border/40 ml-auto">
              <button 
                onClick={selectAll} 
                className="p-1 rounded-none hover:bg-primary/10 text-primary transition-all active:scale-90"
                title="Select All"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-3.5 bg-border/40 mx-0.5" />
              <button 
                onClick={resetToDefault} 
                className="p-1 rounded-none hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90"
                title="Reset"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>


          {/* Column List */}
          <div className="max-h-[340px] overflow-y-auto py-0.5 scrollbar-thin">
            {filteredColumns.map((col) => {
              const isVisible = visibleColumnIds.includes(col.id);
              const isDisabled = col.isCritical;
              
              return (
                <div
                  key={col.id}
                  onClick={() => !isDisabled && toggle(col.id, col.isCritical)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-1 hover:bg-muted/30 transition-colors group relative",
                    isDisabled ? "cursor-not-allowed select-none bg-muted/5" : "cursor-pointer",
                    !isVisible && !isDisabled && "opacity-40 grayscale-[0.5]"
                  )}
                >
                  <div className={cn(
                    "w-3 h-3 rounded-full border border-border flex items-center justify-center transition-all duration-300 shrink-0",
                    isVisible ? (isDisabled ? "bg-muted-foreground/30 border-transparent" : "bg-primary border-primary ring-2 ring-primary/20 shadow-sm") : "bg-transparent group-hover:border-primary/40",
                    isDisabled && "opacity-40"
                  )}>
                    {isVisible && !isDisabled && <div className="w-1.5 h-1.5 bg-white rounded-full animate-in zoom-in duration-300 shadow-xs" />}
                    {isDisabled && <Lock className="w-1.5 h-1.5 text-white" />}
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold text-foreground flex-1 truncate uppercase tracking-[0.15em] leading-6",
                    isDisabled && "text-muted-foreground/60"
                  )}>
                    {col.label}
                  </span>
                  {isDisabled && (
                    <div className="w-1 h-1 rounded-full bg-primary/20" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">{visibleCount} of {totalCount} columns visible</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Multi-select dropdown filter with search and chips
function MultiSelectFilter({ label, icon, options, selected, onChange, isInline = true }: {
  label: string; icon?: React.ReactNode; options: string[]; selected: string[]; onChange: (v: string[]) => void; isInline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };

  const remove = (v: string) => {
    onChange(selected.filter((s) => s !== v));
  };

  const hasSelected = selected.length > 0;
  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={(val) => { setOpen(val); if (!val) setQuery(""); }}>
      <div className={cn("relative", !isInline && "w-full")}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center gap-1.5 transition-all outline-none group text-left",
              !isInline && "w-full"
            )}
          >
            {isInline ? (
              <div className={cn(
                "h-8 px-3 flex items-center gap-2 border bg-card transition-all rounded-[6px] group-hover:border-primary/50 group-data-[state=open]:border-primary hover:shadow-xs",
                hasSelected && "border-primary/40 bg-primary/5 text-primary"
              )}>
                {FILTER_ICONS[label as keyof typeof FILTER_ICONS] || <Filter className="w-3.5 h-3.5 opacity-50" />}
                <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
                {hasSelected && (
                  <span className="ml-1 px-1.5 py-0.5 bg-primary text-white text-[9px] font-bold leading-none rounded-[2px]">
                    {selected.length}
                  </span>
                )}
                <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform shrink-0 ml-auto", open && "rotate-180")} />
              </div>
            ) : (
              <div className={cn(
                "flex items-center gap-2 h-8 px-3 border rounded-[6px] min-w-[120px] justify-between text-xs font-normal transition-all w-full",
                "bg-muted/5 border-border/80 text-muted-foreground group-hover:border-primary/40 group-hover:bg-card group-data-[state=open]:border-primary group-data-[state=open]:bg-card",
                hasSelected && "border-primary/30 bg-primary/5 text-primary"
              )}>
                <span className="text-[11px] font-medium uppercase tracking-tight truncate tracking-[0.05em]">{label}</span>
                <div className="flex items-center gap-1">
                   <span className="truncate max-w-[80px] font-bold text-[10px]">
                    {hasSelected ? (selected.length === 1 ? selected[0] : `${selected.length} Selected`) : "All"}
                  </span>
                  <ChevronDown className={cn("w-3 h-3 text-muted-foreground/60 transition-transform shrink-0", open && "rotate-180")} />
                </div>
              </div>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent 
          className="p-0 border border-border rounded-[6px] shadow-2xl w-60 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[90]"
          sideOffset={isInline ? 8 : 12}
          side={isInline ? "bottom" : "right"}
          align={isInline ? "start" : "start"}
        >
          {/* Header with count and clear */}
          {hasSelected && (
            <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between bg-muted/5">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-tight">
                {label} <span className="text-green-600 ml-0.5">{selected.length}</span>
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); onChange([]); }} 
                className="text-[10px] font-bold text-green-600 hover:text-green-700 transition-colors uppercase tracking-tight"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Selected Pills Area (from image) */}
          {hasSelected && (
            <div className="px-3 py-2 border-b border-border/40 flex flex-wrap gap-1.5 bg-background">
              {selected.map(s => (
                <div key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-medium animate-in fade-in zoom-in-95 duration-200">
                  {s}
                  <button 
                    onClick={(e) => { e.stopPropagation(); remove(s); }}
                    className="hover:bg-green-200/50 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search input - Matching image style */}
          <div className="p-3 border-b border-border/40">
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within/search:text-primary transition-colors" />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 h-9 bg-background border border-border/80 rounded-[6px] text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-auto py-1 bg-background scrollbar-thin">
            {filteredOptions.length === 0 && (
              <p className="px-3 py-4 text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest opacity-40">No results found</p>
            )}
            {filteredOptions.map((opt) => {
              const isChecked = selected.includes(opt);
              return (
                <label 
                  key={opt} 
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 text-[12px] font-medium hover:bg-muted/30 cursor-pointer transition-all group",
                    isChecked ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all bg-background shrink-0",
                    isChecked ? "border-green-600 bg-green-600 shadow-sm" : "border-border/80 group-hover:border-primary/40",
                  )}>
                    {isChecked && <Check className="w-3 h-3 text-white animate-in zoom-in duration-300 stroke-[3]" />}
                  </div>
                  <input type="checkbox" checked={isChecked} onChange={() => toggle(opt)} className="hidden" />
                  <span className="truncate flex-1 tracking-tight">{opt}</span>
                </label>
              );
            })}
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}

export default FilterBar;
