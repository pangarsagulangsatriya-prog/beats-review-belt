import { EvaluationStatus } from "@/types/hazard";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

interface StatusBadgeProps {
  status: EvaluationStatus;
}

const config: Record<EvaluationStatus, { label: string; className: string; icon?: React.ReactNode }> = {
  ai_pending: { label: "AI Pending", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", className: "bg-status-progress/15 text-status-progress border border-status-progress/30" },
  human_locked: {
    label: "Human Locked",
    className: "bg-primary/10 text-primary border border-primary/25",
    icon: <Lock className="w-2.5 h-2.5" />,
  },
  auto_confirmed: {
    label: "Auto-confirmed by AI",
    className: "bg-muted text-muted-foreground border border-border",
    icon: <span className="text-[8px] font-bold bg-muted-foreground/10 px-0.5 rounded">AI</span>,
  },
  completed: { label: "Completed", className: "bg-status-complete/15 text-status-complete border border-status-complete/30" },
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const c = config[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap", c.className)}>
      {c.icon}
      {c.label}
    </span>
  );
};

export default StatusBadge;
