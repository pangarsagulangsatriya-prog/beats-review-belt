import { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown, MapPin, Navigation, Compass, Tag, Layers, FolderTree, Building2, MapPinned } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
}

const FILTER_ICONS: Record<string, React.ReactNode> = {
  "PIC Perusahaan": <Building2 className="w-3 h-3" />,
  Site: <MapPin className="w-3 h-3" />,
  Lokasi: <Navigation className="w-3 h-3" />,
  "Detail Lokasi": <MapPinned className="w-3 h-3" />,
  Ketidaksesuaian: <Compass className="w-3 h-3" />,
  "Sub Ketidaksesuaian": <FolderTree className="w-3 h-3" />,
  TBC: <Tag className="w-3 h-3" />,
  PSPP: <Layers className="w-3 h-3" />,
  GR: <Tag className="w-3 h-3" />,
};

const FilterBar = ({ search, onSearchChange, filters, onFiltersChange, filterOptions }: FilterBarProps) => {
  const activeCount = [
    ...filters.site, ...filters.lokasi, ...filters.detail_location, ...filters.ketidaksesuaian, ...filters.sub_ketidaksesuaian,
    ...filters.pic_perusahaan, ...filters.tbc, ...filters.pspp, ...filters.gr,
  ].length;

  const clearAll = () => onFiltersChange(emptyFilters);

  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div className="relative shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search Task ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 w-48 text-xs"
        />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap flex-1">
        <MultiSelectFilter label="PIC Perusahaan" icon={FILTER_ICONS["PIC Perusahaan"]} options={filterOptions.pic_perusahaan} selected={filters.pic_perusahaan}
          onChange={(v) => onFiltersChange({ ...filters, pic_perusahaan: v })} />
        <MultiSelectFilter label="Site" icon={FILTER_ICONS.Site} options={filterOptions.sites} selected={filters.site}
          onChange={(v) => onFiltersChange({ ...filters, site: v })} />
        <MultiSelectFilter label="Lokasi" icon={FILTER_ICONS.Lokasi} options={filterOptions.lokasi} selected={filters.lokasi}
          onChange={(v) => onFiltersChange({ ...filters, lokasi: v })} />
        <MultiSelectFilter label="Detail Lokasi" icon={FILTER_ICONS["Detail Lokasi"]} options={filterOptions.detail_location} selected={filters.detail_location}
          onChange={(v) => onFiltersChange({ ...filters, detail_location: v })} />
        <MultiSelectFilter label="Ketidaksesuaian" icon={FILTER_ICONS.Ketidaksesuaian} options={filterOptions.ketidaksesuaian} selected={filters.ketidaksesuaian}
          onChange={(v) => onFiltersChange({ ...filters, ketidaksesuaian: v })} />
        <MultiSelectFilter label="Sub Ketidaksesuaian" icon={FILTER_ICONS["Sub Ketidaksesuaian"]} options={filterOptions.sub_ketidaksesuaian} selected={filters.sub_ketidaksesuaian}
          onChange={(v) => onFiltersChange({ ...filters, sub_ketidaksesuaian: v })} />
        <MultiSelectFilter label="TBC" icon={FILTER_ICONS.TBC} options={filterOptions.tbcLabels} selected={filters.tbc}
          onChange={(v) => onFiltersChange({ ...filters, tbc: v })} />
        <MultiSelectFilter label="PSPP" icon={FILTER_ICONS.PSPP} options={filterOptions.psppLabels} selected={filters.pspp}
          onChange={(v) => onFiltersChange({ ...filters, pspp: v })} />
        <MultiSelectFilter label="GR" icon={FILTER_ICONS.GR} options={filterOptions.grLabels} selected={filters.gr}
          onChange={(v) => onFiltersChange({ ...filters, gr: v })} />
        {activeCount > 0 && (
          <button onClick={clearAll} className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] text-destructive hover:text-destructive/80 transition-colors">
            <X className="w-3 h-3" /> Clear ({activeCount})
          </button>
        )}
      </div>
    </div>
  );
};

// Multi-select dropdown filter with search and chips
function MultiSelectFilter({ label, icon, options, selected, onChange }: {
  label: string; icon?: React.ReactNode; options: string[]; selected: string[]; onChange: (v: string[]) => void;
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
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); setQuery(""); }}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[11px] font-medium transition-colors",
          hasSelected ? "border-primary/30 bg-primary/5 text-primary" : "border-border text-foreground hover:bg-muted"
        )}
      >
        {icon}
        {label}{hasSelected && ` (${selected.length})`}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-[60] bg-popover border border-border rounded-lg shadow-xl w-56 overflow-hidden">
          {/* Header with count and clear */}
          {hasSelected && (
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[11px] font-medium text-foreground">{label} <span className="text-primary font-semibold">{selected.length}</span></span>
              <button onClick={() => onChange([])} className="text-[10px] text-primary hover:text-primary/80 transition-colors">Clear All</button>
            </div>
          )}

          {/* Selected chips */}
          {hasSelected && (
            <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1">
              {selected.map(s => (
                <span key={s} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 text-[10px] font-medium">
                  {s}
                  <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive transition-colors" onClick={(e) => { e.stopPropagation(); remove(s); }} />
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                placeholder={`Search ${label.toLowerCase()}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-[11px] bg-transparent border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-44 overflow-auto py-1">
            {filteredOptions.length === 0 && (
              <p className="px-3 py-2 text-[11px] text-muted-foreground">No results</p>
            )}
            {filteredOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-muted/50 cursor-pointer transition-colors">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="accent-primary w-3 h-3" />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterBar;
