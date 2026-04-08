import { LayoutDashboard, ClipboardCheck, History } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: false },
  { icon: ClipboardCheck, label: "Evaluation", active: true },
  { icon: History, label: "History", active: false },
];

const Sidebar = () => {
  return (
    <aside className="flex flex-col items-center w-[56px] bg-card py-3 gap-0.5 border-r border-border shrink-0">
      <div className="w-8 h-8 rounded-lg overflow-hidden mb-6 ring-1 ring-border/50">
        <img src="/logo.png" alt="Safety Intelligence" className="w-full h-full object-cover" />
      </div>
      {navItems.map((item) => (
        <button
          key={item.label}
          title={item.label}
          className={cn(
            "w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all duration-150 gap-0.5",
            item.active
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-accent-foreground hover:bg-accent/50"
          )}
        >
          <item.icon className="w-[18px] h-[18px]" />
          <span className="text-[8px] font-medium leading-none">{item.label.slice(0, 4)}</span>
        </button>
      ))}
    </aside>
  );
};

export default Sidebar;
