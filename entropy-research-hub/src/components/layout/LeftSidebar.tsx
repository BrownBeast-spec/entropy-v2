import { useLocation, useNavigate } from "react-router-dom";
import {
  Bot, FileText, Users, Building2, Zap, Settings, BookOpen, HelpCircle, ChevronDown,
  LayoutGrid, Home
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Bot, label: "Agent", path: "/agent" },
  { icon: FileText, label: "Topics", path: "/topics" },
  { icon: Users, label: "People", path: "/people" },
  { icon: Building2, label: "Companies", path: "/companies" },
  { icon: LayoutGrid, label: "Workspaces", path: "/workspaces" },
  { icon: Zap, label: "Automations", path: "/automations" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function LeftSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/settings") return location.pathname.startsWith("/settings");
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div className="w-[240px] min-w-[240px] h-screen flex flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="h-12 flex items-center gap-2 px-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors">
        <Home className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-foreground font-semibold text-sm">Entropy</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
              isActive(item.path)
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-3 space-y-1">
        <div className="mx-1 mb-3">
          <div className="text-2xs text-muted-foreground bg-accent rounded-full px-3 py-1.5 text-center">
            Trial ends in 14 days
          </div>
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">
          <BookOpen className="w-4 h-4" />
          Docs
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">
          <HelpCircle className="w-4 h-4" />
          Help
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors">
          <div className="w-5 h-5 rounded-full bg-destructive/80 flex items-center justify-center text-[10px] font-semibold text-foreground">A</div>
          Alen
        </button>
      </div>
    </div>
  );
}
