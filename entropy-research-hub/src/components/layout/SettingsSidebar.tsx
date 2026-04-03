import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const settingsNav = [
  { label: "Organization", path: "/settings" },
  { label: "Members", path: "/settings/members" },
  { label: "Keywords", path: "/settings/keywords" },
  { label: "Topics", path: "/settings/topics" },
  { label: "Projects", path: "/settings/projects" },
  { label: "Integrations", path: "/settings/integrations" },
  { label: "MCP Servers", path: "/settings/mcp-servers" },
  { label: "Channels", path: "/settings/channels" },
  { label: "Billing & Usage", path: "/settings/billing" },
];

export default function SettingsSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/settings") return location.pathname === "/settings" || location.pathname === "/settings/organization";
    return location.pathname === path;
  };

  return (
    <nav className="w-[180px] min-w-[180px] py-6 px-2 space-y-0.5">
      {settingsNav.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={cn(
            "w-full text-left px-3 py-1.5 rounded-md text-[13px] transition-colors",
            isActive(item.path)
              ? "text-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
