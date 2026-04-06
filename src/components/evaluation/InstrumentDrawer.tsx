import { useState, useEffect } from "react";
import { X, Settings2, Eye, EyeOff, Search, GripVertical, Briefcase, Lock, ChevronDown, CheckCircle2, ChevronRight, Info, Anchor, Rows } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnDef {
  id: string;
  label: string;
  isCritical?: boolean;
}

interface InstrumentDrawerProps {
  open: boolean;
  onClose: () => void;
  columns: ColumnDef[];
  visibleColumnIds: string[];
  onVisibleColumnIdsChange: (ids: string[]) => void;
  freezeColumns: number;
  onFreezeColumnsChange: (val: number) => void;
  rowHeight: number;
  onRowHeightChange: (val: number) => void;
}

/** High-fidelity Precision Instrument Drawer */
export function InstrumentDrawer({
  open,
  onClose,
  columns,
  visibleColumnIds,
  onVisibleColumnIdsChange,
  freezeColumns,
  onFreezeColumnsChange,
  rowHeight,
  onRowHeightChange,
}: InstrumentDrawerProps) {
  const [search, setSearch] = useState("");

  const filtered = columns.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));
  const visibleItems = filtered.filter(c => visibleColumnIds.includes(c.id));
  const hiddenItems = filtered.filter(c => !visibleColumnIds.includes(c.id));

  const toggle = (id: string, isCritical?: boolean) => {
    if (isCritical) return;
    if (visibleColumnIds.includes(id)) {
      onVisibleColumnIdsChange(visibleColumnIds.filter(cid => cid !== id));
    } else {
      onVisibleColumnIdsChange([...visibleColumnIds, id]);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/25 z-[200] animate-in fade-in duration-300" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[300px] bg-background border-l border-border z-[201] shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 pb-2 flex items-center justify-between shrink-0 border-b border-border/40">
          <div className="flex flex-col gap-0">
            <h1 className="text-[13px] font-bold tracking-tight text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Settings2 className="w-3.5 h-3.5 text-primary" />
              Column Settings
            </h1>
            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.15em] opacity-60">{visibleColumnIds.length}/{columns.length} dimensions configured</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors group">
            <X className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 mb-1 shrink-0 bg-muted/10 border-b border-border/30">
          <div className="relative group/search">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground opacity-40 group-focus-within/search:text-primary group-focus-within/search:opacity-100 transition-all font-black" />
            <input
              type="text"
              placeholder="Search columns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-background border border-border/60 rounded-[4px] text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40 uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col pt-2">
          {/* Column Visibility Section - Now at Top */}
          <div className="space-y-0.5 px-3 flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none opacity-50">Column Visibility</h2>
            </div>
            
            <div className="space-y-[1px]">
              {filtered.map(c => {
                const isVisible = visibleColumnIds.includes(c.id);
                return (
                  <div 
                    key={c.id} 
                    className={cn(
                      "group flex items-center gap-1.5 px-1.5 py-1 rounded-[4px] transition-all hover:bg-muted relative border border-transparent",
                      c.isCritical && "bg-muted/10 opacity-70",
                      !isVisible && "opacity-50"
                    )}
                  >
                    <GripVertical className="w-3 h-3 text-muted-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0 px-0.5" />
                    <button 
                      onClick={() => toggle(c.id, c.isCritical)}
                      className={cn(
                        "p-0.5 rounded transition-all shrink-0",
                        c.isCritical ? "cursor-not-allowed opacity-20" : isVisible ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <span className={cn(
                      "text-[11px] font-bold text-foreground tracking-tight leading-none truncate flex-1",
                      c.isCritical && "text-muted-foreground font-semibold",
                      !isVisible && "text-muted-foreground line-through decoration-muted-foreground/30"
                    )}>{c.label}</span>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 shrink-0">
                      {c.id === "pic" && <Briefcase className="w-2.5 h-2.5" />}
                      {c.isCritical && <Lock className="w-2.5 h-2.5" />}
                      <ChevronDown className="w-2.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Layout Controls - Now at bottom of scroll area */}
          <div className="p-3 border-t border-border/40 bg-muted/5 space-y-3 mt-4 mb-2">
             <div className="flex items-center justify-between px-1">
              <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none opacity-50">Grid Layout</h2>
            </div>

            {/* Freeze Columns */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Anchor className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                <span className="text-[11px] font-bold text-foreground uppercase tracking-tight">Freeze columns</span>
              </div>
              <select 
                value={freezeColumns} 
                onChange={(e) => onFreezeColumnsChange(Number(e.target.value))}
                className="bg-card border border-border/60 rounded-[4px] text-[10px] font-bold px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer hover:border-primary/40 transition-all uppercase"
              >
                <option value={1}>1 column</option>
                <option value={2}>2 columns</option>
                <option value={3}>3 columns</option>
              </select>
            </div>

            {/* Row Height */}
            <div className="flex items-center justify-between px-1 pb-2">
              <div className="flex items-center gap-2">
                <Rows className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                <span className="text-[11px] font-bold text-foreground uppercase tracking-tight">Row height</span>
              </div>
              <select 
                value={rowHeight} 
                onChange={(e) => onRowHeightChange(Number(e.target.value))}
                className="bg-card border border-border/60 rounded-[4px] text-[10px] font-bold px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer hover:border-primary/40 transition-all uppercase"
              >
                <option value={1}>1 line</option>
                <option value={2}>2 lines</option>
                <option value={3}>3 lines</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="p-3 bg-muted/30 border-t border-border shrink-0">
           <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
             <Info className="w-3 h-3 text-primary/50" />
             Core dimensions are locked
           </div>
        </div>
      </div>
    </>
  );
}
