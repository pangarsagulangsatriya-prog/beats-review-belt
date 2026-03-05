import { RefreshCw, User, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Navbar = () => {
  return (
    <header className="h-[52px] bg-card border-b border-border flex items-center justify-between px-5 shrink-0" style={{ boxShadow: 'var(--shadow-xs)' }}>
      <div className="flex items-center gap-2.5">
        <div>
          <h1 className="text-[13px] font-semibold text-foreground leading-tight tracking-tight">
            BEATS Hazard Reporting
            <span className="ml-2 text-[10px] font-normal text-muted-foreground tracking-normal">v2.0</span>
          </h1>
          <p className="text-[10px] text-muted-foreground leading-tight">AI-Powered Safety Analysis & Evaluation</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-[11px] h-8 font-medium"
          onClick={() => toast.info("Syncing hazards...")}
        >
          <RefreshCw className="w-3 h-3" />
          Sync
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[11px] font-medium text-foreground leading-tight">Fauzan Aji</p>
            <span className="text-[9px] text-muted-foreground font-medium">Evaluator</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
