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
              Column Precision
            </h1>
            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.15em] opacity-60">{visibleItems.length}/{columns.length} dimensions enabled</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors group">
            <X className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
          </button>
        </div>

        {/* Layout Dimension Controls */}
        <div className="p-3 border-b border-border/40 bg-muted/5 space-y-2">
          {/* Freeze Columns */}
          <div className="flex items-center justify-between">
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
          <div className="flex items-center justify-between">
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

        {/* Search */}
        <div className="p-3 mb-1 shrink-0 bg-muted/10 border-b border-border/30">
          <div className="relative group/search">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground opacity-40 group-focus-within/search:text-primary group-focus-within/search:opacity-100 transition-all font-black" />
            <input
              type="text"
              placeholder="Filter dimensions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-background border border-border/60 rounded-[4px] text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40 uppercase tracking-widest"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-0 space-y-4 pt-2">
          {/* Visible Section */}
          <div className="space-y-0.5 px-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none opacity-50">Enabled Metrics</h2>
            </div>
            
            <div className="space-y-[1px]">
              {visibleItems.map(c => (
                <div 
                  key={c.id} 
                  className={cn(
                    "group flex items-center gap-1.5 px-1.5 py-1 rounded-[4px] transition-all hover:bg-muted relative border border-transparent",
                    c.isCritical && "bg-muted/10 opacity-70"
                  )}
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab shrink-0 px-0.5" />
                  <button 
                    onClick={() => toggle(c.id, c.isCritical)}
                    className={cn(
                      "p-0.5 rounded transition-all shrink-0",
                      c.isCritical ? "cursor-not-allowed opacity-20" : "hover:bg-primary/10 text-primary"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <span className={cn(
                    "text-[11px] font-bold text-foreground tracking-tight leading-none truncate flex-1",
                    c.isCritical && "text-muted-foreground font-semibold"
                  )}>{c.label}</span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/30 shrink-0">
                    {c.id === "pic" && <Briefcase className="w-2.5 h-2.5" />}
                    {c.isCritical && <Lock className="w-2.5 h-2.5" />}
                    <ChevronDown className="w-2.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
            
            <button className="flex items-center justify-between w-full mt-4 px-2.5 py-1.5 border border-dashed border-border/80 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border transition-all group shadow-xs">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 opacity-30" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em]">Registered Metric</span>
              </div>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
            </button>
          </div>

          {/* Hidden Section */}
          {hiddenItems.length > 0 && (
            <div className="space-y-0.5 px-3 pb-8">
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] leading-none opacity-40">Hidden dimensions</h2>
              </div>
              <div className="space-y-[1px]">
                {hiddenItems.map(c => (
                  <div 
                    key={c.id} 
                    className="group flex items-center justify-between px-1.5 py-1 rounded-[4px] transition-all hover:bg-muted opacity-60 hover:opacity-100 border border-transparent"
                  >
                     <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <button 
                        onClick={() => toggle(c.id, c.isCritical)}
                        className="p-0.5 rounded hover:bg-white text-muted-foreground transition-all border border-transparent"
                      >
                        <EyeOff className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                      </button>
                      <span className="text-[11px] font-bold text-muted-foreground line-through decoration-muted-foreground/30 truncate leading-none">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 shrink-0">
                       <Settings2 className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
