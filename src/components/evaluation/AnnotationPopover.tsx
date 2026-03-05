import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AILabel, TBC_OPTIONS, getCandidateLines } from "@/types/hazard";
import AIBadge from "./AIBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Lock, Timer, Check, User, Eye, SquarePen } from "lucide-react";

interface AnnotationPopoverProps {
  label: AILabel;
  fieldName?: string;
  options?: string[];
  onApply: (humanLabel: string, note: string) => void;
  slaDeadline?: string;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  editingBy?: string | null;
  currentUser?: string;
}

const SLA_DURATION_MS = 60_000;

type SelectionMode = "candidate" | "other" | null;

const AnnotationPopover = ({ label, fieldName = "TBC", options, onApply, slaDeadline, onOpenChange, disabled, editingBy, currentUser = "FAUZAN AJI" }: AnnotationPopoverProps) => {
  const [open, setOpenState] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [otherLabel, setOtherLabel] = useState("");
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(null);
  const [reason, setReason] = useState("");
  const [startTime] = useState(() => Date.now());
  const [progress, setProgress] = useState(100);
  const [timeLeftText, setTimeLeftText] = useState("");
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [autoLocked, setAutoLocked] = useState(false);
  const [confirmStep, setConfirmStep] = useState<0 | 1>(0); // 0 = default, 1 = awaiting second click
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };

  const isLocked = label.locked || label.auto_confirmed || autoLocked;
  const candidates = label.candidates.slice(0, 3);
  const allOptions = options || TBC_OPTIONS;
  const relevance = candidates[0]?.relevance ?? 0;

  // SLA timer + auto-confirm on expiry
  useEffect(() => {
    if (label.locked || label.auto_confirmed) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      const remaining = Math.max(0, SLA_DURATION_MS - (Date.now() - startTime));
      setProgress((remaining / SLA_DURATION_MS) * 100);
      const secs = Math.ceil(remaining / 1000);
      setTimeLeftText(`${Math.floor(secs / 60)}m ${(secs % 60).toString().padStart(2, "0")}s`);
      if (remaining <= 0) {
        if (intervalId) clearInterval(intervalId);
        if (!autoLocked && candidates[0]) {
          setAutoLocked(true);
          onApply(candidates[0].label, "Auto-confirmed by AI (SLA expired)");
          setOpen(false);
          toast.info("SLA expired — auto-confirmed by AI with top prediction");
        }
      }
    };
    tick();
    intervalId = setInterval(tick, 1000);
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [startTime, label.locked, label.auto_confirmed, autoLocked, candidates, onApply]);

  const computePosition = useCallback(() => {
    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();
    const popoverWidth = 640;
    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - popoverWidth - 16);
    }
    setPopoverStyle({
      position: "fixed" as const,
      top: rect.bottom + 8,
      left,
      zIndex: 60,
    });
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setSelectedIndex(null);
    setOtherLabel("");
    setSelectionMode(null);
    setReason("");
    setConfirmStep(0);
    computePosition();
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleCandidateClick = useCallback((i: number) => {
    if (isLocked) return;
    if (selectionMode === "other") return;
    if (i === 0) return;
    if (selectedIndex === i) {
      setSelectedIndex(null);
      setSelectionMode(null);
    } else {
      setSelectedIndex(i);
      setSelectionMode("candidate");
    }
  }, [isLocked, selectionMode, selectedIndex]);

  const handleOtherSelect = (value: string) => {
    if (isLocked) return;
    setOtherLabel(value);
    setSelectionMode("other");
    setSelectedIndex(null);
  };

  const clearOther = () => {
    setOtherLabel("");
    setSelectionMode(null);
  };

  const selectedLabel = selectionMode === "candidate" && selectedIndex !== null
    ? candidates[selectedIndex]?.label
    : selectionMode === "other" && otherLabel
      ? otherLabel
      : null;

  const hasOverride = selectionMode !== null;
  const canConfirm = selectedLabel !== null && reason.trim().length > 0;

  // 2-step inline confirm
  const handleConfirmClick = () => {
    if (!canConfirm) return;

    if (confirmStep === 0) {
      setConfirmStep(1);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => {
        setConfirmStep(0);
      }, 2500);
    } else {
      // Second click — lock immediately
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      if (selectedLabel) {
        onApply(selectedLabel, reason);
        setOpen(false);
        toast.success(`Annotation locked to "${selectedLabel}"`, {
          action: {
            label: "Undo",
            onClick: () => {
              // Undo is informational — in real app would revert
              toast.info("Undo not available in demo mode");
            },
          },
          duration: 5000,
        });
      }
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Enter" && canConfirm) {
        e.preventDefault();
        handleConfirmClick();
      }
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        toast.info("Undo not available in demo mode");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, canConfirm, confirmStep, selectedLabel, reason]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const urgencyColor = progress < 15 ? "text-destructive" : progress < 40 ? "text-warning" : "text-muted-foreground";
  const barColor = progress < 15 ? "bg-destructive" : progress < 40 ? "bg-warning" : "bg-primary";

  const candidateDisabled = selectionMode === "other";
  const otherDisabled = selectionMode === "candidate";

  const otherSectionLabel = `Other ${fieldName}`;
  const otherPlaceholder = `Select Other ${fieldName}`;

  return (
    <>
      <div className="relative inline-block" ref={badgeRef}>
        <div onClick={open ? handleClose : handleOpen} className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
          <AIBadge label={label} slaDeadline={slaDeadline} disabled={disabled} editingBy={editingBy} fieldType={fieldName.toLowerCase() as "tbc" | "pspp" | "gr"} />
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={handleClose} />
          <div
            ref={popoverRef}
            className="w-[640px] rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 overflow-hidden"
            style={popoverStyle}
          >
            {/* Current editor banner */}
            {!isLocked && (
              <div className="px-3 py-1.5 bg-primary/[0.06] border-b border-border flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <SquarePen className="w-3 h-3 text-primary shrink-0" />
                <span>Editing by <strong className="text-foreground">{currentUser}</strong></span>
              </div>
            )}
            {isLocked && (
              <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-2 text-[11px] text-muted-foreground rounded-t-lg">
                <Eye className="w-3 h-3 shrink-0 text-muted-foreground" />
                {label.auto_confirmed ? (
                  <span>Auto-confirmed · {label.annotated_at ? new Date(label.annotated_at).toLocaleString() : "N/A"}</span>
                ) : (
                  <span>Confirmed by <strong>{label.annotated_by}</strong> · {label.annotated_at ? new Date(label.annotated_at).toLocaleString() : "N/A"}</span>
                )}
                <Lock className="w-3 h-3 shrink-0 text-primary ml-auto" />
              </div>
            )}

            {!isLocked ? (
              <div className="flex divide-x divide-border">
                {/* LEFT: AI Candidates + Other */}
                <div className="flex-1 p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-foreground">AI Candidates</h4>
                  <div className="space-y-1.5">
                    {candidates.map((c, i) => {
                      const isTop = i === 0;
                      const isSelected = selectionMode === "candidate" && selectedIndex === i;
                      const isDimmed = isTop
                        ? selectionMode !== null
                        : candidateDisabled || (selectionMode === "candidate" && selectedIndex !== null && selectedIndex !== i);

                      return (
                        <TooltipProvider key={i} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded border transition-colors",
                                  isTop && selectionMode === null && "bg-primary/[0.06] border-primary/20",
                                  isDimmed ? "cursor-default border-border bg-muted/30 opacity-50" :
                                  isSelected ? "bg-primary/8 border-primary/30 cursor-pointer" :
                                  !isTop ? "border-border hover:bg-muted/40 cursor-pointer" : ""
                                )}
                                onClick={() => !isTop && !isDimmed && handleCandidateClick(i)}
                              >
                                <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0 text-center">{i + 1}</span>
                                {!isTop && !candidateDisabled ? (
                                  <div
                                    className={cn(
                                      "w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/40",
                                      isDimmed && "opacity-40"
                                    )}
                                  >
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                                  </div>
                                ) : (
                                  <div className="w-3.5 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    {(() => {
                                      const fieldType = fieldName.toLowerCase() as "tbc" | "pspp" | "gr";
                                      const lines = getCandidateLines(c, fieldType);
                                      return (
                                        <div className="flex-1 min-w-0">
                                          <span className="text-[11px] font-medium text-foreground truncate block">{lines.primary}</span>
                                          {lines.secondary && (
                                            <span className="text-[9px] text-muted-foreground truncate block">{lines.secondary}</span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    <span className={cn("text-[10px] font-semibold shrink-0", c.relevance >= 70 ? "text-status-complete" : c.relevance >= 50 ? "text-foreground" : "text-destructive")}>
                                      {c.relevance}%
                                    </span>
                                  </div>
                                  <Progress value={c.relevance} className="h-1 mt-1" />
                                  {isTop && (
                                    <span className="text-[9px] text-primary/70 mt-0.5 block font-medium">Top AI Prediction</span>
                                  )}
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[280px] text-[11px] p-3 leading-relaxed">
                              <p className="font-semibold mb-1">AI Reasoning</p>
                              <p className="text-muted-foreground">{c.reasoning}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>

                  {/* Other section */}
                  <div className={cn("pt-2 border-t border-border", otherDisabled && "opacity-50")}>
                    <label className="text-[11px] font-semibold text-foreground mb-1 block">{otherSectionLabel}</label>
                    <Select
                      value={otherLabel}
                      onValueChange={handleOtherSelect}
                      disabled={otherDisabled}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={otherPlaceholder} />
                      </SelectTrigger>
                      <SelectContent className="z-[70] max-h-[240px]">
                        {allOptions.map((opt) => (
                          <SelectItem key={opt} value={opt} className="text-xs">
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectionMode === "other" && otherLabel && (
                      <button onClick={clearOther} className="text-[9px] text-destructive hover:underline mt-1">
                        Clear selection
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT: Manual Review */}
                <div className="flex-1 p-3 space-y-2.5 flex flex-col">
                  <h4 className="text-xs font-semibold text-foreground">Manual Review</h4>

                  <div>
                    <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
                      Reason for override <span className="text-destructive">*</span>
                    </label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={hasOverride ? "Explain why you chose a different label." : "Select a candidate or other label first..."}
                      className={cn("text-xs min-h-[80px] resize-none", !hasOverride && "opacity-50 cursor-not-allowed")}
                      disabled={!hasOverride}
                    />
                  </div>

                  {/* SLA Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-[10px] flex items-center gap-1", urgencyColor)}>
                        <Timer className="w-3 h-3" />
                        Auto confirmation in {timeLeftText}
                      </p>
                      <span className={cn("text-[9px] font-mono", urgencyColor)}>{Math.round(progress)}%</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear", barColor)}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Inline 2-step confirm */}
                  <div className="flex flex-col gap-1.5 pt-1 mt-auto">
                    {confirmStep === 1 && (
                      <p className="text-[10px] text-status-progress font-medium text-center animate-in fade-in-0">
                        Click again to LOCK label
                      </p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleClose}>Cancel</Button>
                      <Button
                        size="sm"
                        className={cn(
                          "text-xs h-7 transition-all",
                          confirmStep === 1 && "bg-status-complete hover:bg-status-complete/90 text-primary-foreground"
                        )}
                        onClick={handleConfirmClick}
                        disabled={!canConfirm}
                      >
                        {confirmStep === 0 ? (
                          "Confirm Annotation"
                        ) : (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Confirm Lock
                          </span>
                        )}
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground text-right">Enter to confirm · Ctrl+Z to undo</p>
                  </div>
                </div>
              </div>
            ) : (
              /* LOCKED VIEW */
              <div className="flex divide-x divide-border">
                {/* LEFT: AI Candidates (read-only) */}
                <div className="flex-1 p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-foreground">AI Candidates</h4>
                  <div className="space-y-1.5">
                    {candidates.map((c, i) => (
                      <TooltipProvider key={i} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 p-2 rounded border border-border bg-muted/20 cursor-default hover:bg-muted/40 transition-colors">
                              <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0 text-center">{i + 1}</span>
                              <div className="w-3.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  {(() => {
                                    const fieldType = fieldName.toLowerCase() as "tbc" | "pspp" | "gr";
                                    const lines = getCandidateLines(c, fieldType);
                                    return (
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[11px] font-medium text-foreground truncate block">{lines.primary}</span>
                                        {lines.secondary && (
                                          <span className="text-[9px] text-muted-foreground truncate block">{lines.secondary}</span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  <span className={cn("text-[10px] font-semibold shrink-0", c.relevance >= 70 ? "text-status-complete" : c.relevance >= 50 ? "text-foreground" : "text-destructive")}>
                                    {c.relevance}%
                                  </span>
                                </div>
                                <Progress value={c.relevance} className="h-1 mt-1" />
                                {i === 0 && (
                                  <span className="text-[9px] text-muted-foreground mt-0.5 block">Top AI Prediction</span>
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[280px] text-[11px] p-3 leading-relaxed">
                            <p className="font-semibold mb-1">AI Reasoning</p>
                            <p className="text-muted-foreground">{c.reasoning}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Annotation History */}
                <div className="flex-1 p-3 space-y-2">
                  <h4 className="text-xs font-semibold text-foreground">Annotation History</h4>
               <div className="text-[11px] space-y-2 rounded border border-border overflow-hidden">
                    {/* Human locked */}
                    {label.human_label && !label.auto_confirmed && (
                      <>
                        {/* Final Label - standout row */}
                         <div className="flex items-center justify-between px-3 py-3 bg-primary/[0.08] border-b border-primary/15">
                           <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Final Label</span>
                           <div className="text-right">
                             <span className="font-bold text-foreground text-[13px] block">{(() => {
                               const fieldType = fieldName.toLowerCase() as "tbc" | "pspp" | "gr";
                               const topCandidate = label.candidates?.[0];
                               if (topCandidate) {
                                 const lines = getCandidateLines(topCandidate, fieldType);
                                 return lines.primary;
                               }
                               return label.human_label;
                             })()}</span>
                             {(() => {
                               const fieldType = fieldName.toLowerCase() as "tbc" | "pspp" | "gr";
                               const topCandidate = label.candidates?.[0];
                               if (topCandidate) {
                                 const lines = getCandidateLines(topCandidate, fieldType);
                                 if (lines.secondary) return <span className="text-[10px] text-muted-foreground block">{lines.secondary}</span>;
                               }
                               return null;
                             })()}
                           </div>
                         </div>
                        <div className="px-3 pb-2 space-y-1.5">
                          {label.annotated_by && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Confirmed by</span>
                              <span className="font-medium text-foreground">{label.annotated_by}</span>
                            </div>
                          )}
                          {label.annotated_at && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Timestamp</span>
                              <span className="text-foreground">{new Date(label.annotated_at).toLocaleString()}</span>
                            </div>
                          )}
                          {label.annotation_note && (
                            <div className="pt-1.5 border-t border-border">
                              <span className="text-muted-foreground block mb-0.5">Note</span>
                              <p className="text-foreground italic">"{label.annotation_note}"</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {/* AI auto-confirmed */}
                    {label.auto_confirmed && (
                      <>
                        {/* Final Label - standout row */}
                         <div className="flex items-center justify-between px-3 py-3 bg-primary/[0.08] border-b border-primary/15">
                           <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Final Label</span>
                           <div className="text-right">
                             <span className="font-bold text-foreground text-[13px] flex items-center gap-1.5 justify-end">
                               <span className="text-[9px] font-bold text-primary-foreground bg-primary px-1.5 py-0.5 rounded">AI</span>
                               {(() => {
                                 const fieldType = fieldName.toLowerCase() as "tbc" | "pspp" | "gr";
                                 const topCandidate = label.candidates?.[0];
                                 if (topCandidate) {
                                   const lines = getCandidateLines(topCandidate, fieldType);
                                   return lines.primary;
                                 }
                                 return label.human_label || label.ai_label;
                               })()}
                             </span>
                             {(() => {
                               const fieldType = fieldName.toLowerCase() as "tbc" | "pspp" | "gr";
                               const topCandidate = label.candidates?.[0];
                               if (topCandidate) {
                                 const lines = getCandidateLines(topCandidate, fieldType);
                                 if (lines.secondary) return <span className="text-[10px] text-muted-foreground block">{lines.secondary}</span>;
                               }
                               return null;
                             })()}
                           </div>
                         </div>
                        <div className="px-3 pb-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Confirmed by</span>
                            <span className="text-foreground">System (AI Auto-Confirm)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Reason</span>
                            <span className="text-foreground">AI confidence met threshold</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Relevance score</span>
                            <span className="text-foreground font-medium">{relevance}%</span>
                          </div>
                          {label.annotated_at && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Timestamp</span>
                              <span className="text-foreground">{new Date(label.annotated_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default AnnotationPopover;
