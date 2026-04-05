import { useLocation } from "react-router-dom";

const breadcrumbMap: Record<string, string[]> = {
  "/agent": ["Agent"],
  "/topics": ["Topics"],
  "/people": ["People"],
  "/companies": ["Companies"],
  "/workspaces": ["Workspaces"],
  "/automations": ["Automations"],
  "/settings": ["Settings", "Organization"],
  "/settings/organization": ["Settings", "Organization"],
  "/settings/members": ["Settings", "Members"],
  "/settings/integrations": ["Settings", "Integrations"],
  "/settings/mcp-servers": ["Settings", "MCP Servers"],
  "/settings/data-sources": ["Settings", "Data Sources"],
  "/settings/graph-preferences": ["Settings", "Graph Preferences"],
  "/settings/export-preferences": ["Settings", "Export Preferences"],
};

export default function TopBar() {
  const location = useLocation();
  const crumbs = breadcrumbMap[location.pathname] || ["Agent"];

  return (
    <div className="h-12 flex items-center justify-between px-6 border-b border-border bg-card">
      <div className="flex items-center gap-2 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            <span className={i === crumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"}>
              {crumb}
            </span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted-foreground hidden lg:block">A Friendly Greeting to ...</span>
        <button className="px-3 py-1.5 rounded-md border border-border text-[13px] font-medium text-foreground hover:bg-accent transition-colors">
          Hey
        </button>
      </div>
    </div>
  );
}
