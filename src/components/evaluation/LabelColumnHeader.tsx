import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronUp, ArrowDownUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

export type LabelFilterValue = "all" | "auto_confirmed" | "human_annotated" | "waiting";
export type LabelSortValue = "relevance_desc" | "relevance_asc" | "sla_asc" | "sla_desc";

interface LabelColumnHeaderProps {
  label: string;
  filter: LabelFilterValue;
  sort: LabelSortValue | null;
  onFilterChange: (v: LabelFilterValue) => void;
  onSortChange: (v: LabelSortValue | null) => void;
}

const FILTER_OPTIONS: { value: LabelFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "auto_confirmed", label: "Auto-confirmed (AI)" },
  { value: "human_annotated", label: "Annotated by Human" },
  { value: "waiting", label: "Waiting" },
];

const SORT_OPTIONS: { value: LabelSortValue; label: string }[] = [
  { value: "relevance_desc", label: "Highest Relevance" },
  { value: "relevance_asc", label: "Lowest Relevance" },
  { value: "sla_asc", label: "Most Urgent SLA" },
  { value: "sla_desc", label: "Least Urgent SLA" },
];

const FILTER_SHORT: Record<LabelFilterValue, string> = {
  all: "All",
  auto_confirmed: "AI",
  human_annotated: "Human",
  waiting: "Wait",
};

function useDropdownPosition(triggerRef: React.RefObject<HTMLButtonElement>, isOpen: boolean) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.right });
  }, [isOpen, triggerRef]);

  return pos;
}

export default function LabelColumnHeader({ label, filter, sort, onFilterChange, onSortChange }: LabelColumnHeaderProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const filterDropRef = useRef<HTMLDivElement>(null);
  const sortDropRef = useRef<HTMLDivElement>(null);

  const filterPos = useDropdownPosition(filterBtnRef, showFilter);
  const sortPos = useDropdownPosition(sortBtnRef, showSort);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showFilter && filterDropRef.current && !filterDropRef.current.contains(target) && filterBtnRef.current && !filterBtnRef.current.contains(target)) {
        setShowFilter(false);
      }
      if (showSort && sortDropRef.current && !sortDropRef.current.contains(target) && sortBtnRef.current && !sortBtnRef.current.contains(target)) {
        setShowSort(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilter, showSort]);

  const isFiltered = filter !== "all";
  const isSorted = sort !== null;

  const filterDropdown = showFilter ? createPortal(
    <div
      ref={filterDropRef}
      className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl py-1 w-[170px]"
      style={{ top: filterPos.top, left: filterPos.left, transform: "translateX(-100%)" }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Show</div>
      {FILTER_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={(e) => { e.stopPropagation(); onFilterChange(opt.value); setShowFilter(false); }}
          className={cn(
            "w-full text-left px-3 py-2 text-[11px] transition-colors",
            filter === opt.value
              ? "bg-primary text-primary-foreground font-medium"
              : "text-foreground hover:bg-muted"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  const sortDropdown = showSort ? createPortal(
    <div
      ref={sortDropRef}
      className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl py-1 w-[165px]"
      style={{ top: sortPos.top, left: sortPos.left, transform: "translateX(-100%)" }}
    >
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={(e) => { e.stopPropagation(); onSortChange(sort === opt.value ? null : opt.value); setShowSort(false); }}
          className={cn(
            "w-full text-left px-3 py-2 text-[11px] flex items-center gap-1.5 transition-colors",
            sort === opt.value
              ? "bg-primary text-primary-foreground font-medium"
              : "text-foreground hover:bg-muted"
          )}
        >
          {sort === opt.value && <span className="text-[8px]">✓</span>}
          {opt.label}
        </button>
      ))}
      {isSorted && (
        <>
          <div className="h-px bg-border my-0.5" />
          <button
            onClick={(e) => { e.stopPropagation(); onSortChange(null); setShowSort(false); }}
            className="w-full text-left px-3 py-2 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
          >
            Clear sort
          </button>
        </>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div className="flex items-center justify-between w-full gap-1.5">
      <span className="font-semibold text-[11px]">{label}</span>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          ref={filterBtnRef}
          onClick={(e) => { e.stopPropagation(); setShowFilter(v => !v); setShowSort(false); }}
          className={cn(
            "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium transition-colors border",
            isFiltered
              ? "bg-primary/10 text-primary border-primary/20"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {FILTER_SHORT[filter]}
          {showFilter ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        </button>

        <button
          ref={sortBtnRef}
          onClick={(e) => { e.stopPropagation(); setShowSort(v => !v); setShowFilter(false); }}
          className={cn(
            "p-0.5 rounded transition-colors",
            isSorted
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <ArrowDownUp className="w-3 h-3" />
        </button>
      </div>

      {filterDropdown}
      {sortDropdown}
    </div>
  );
}
